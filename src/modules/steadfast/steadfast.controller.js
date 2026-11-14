// ==========================================
// modules/steadfast/steadfast.controller.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../../config/db");
const steadfastService = require("./steadfast.service");

/**
 * Sanitize and validate Bangladesh phone numbers
 * Accepts: 01712345678, +8801712345678, 8801712345678
 * Returns: Clean 11-digit string (e.g. "01712345678") or null
 */
const sanitizeBdPhone = (rawPhone) => {
  if (!rawPhone) return null;
  let cleaned = String(rawPhone).replace(/[\s\-\(\)\.]/g, "");

  if (cleaned.startsWith("+880")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("880")) {
    cleaned = cleaned.slice(2);
  }

  const bdPhoneRegex = /^01[3-9]\d{8}$/;
  return bdPhoneRegex.test(cleaned) ? cleaned : null;
};

// ==========================================
// CREATE PARCEL (MANUAL ADMIN BOOKING)
// ==========================================

const createParcel = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Order ID",
    });
  }

  const db = getDB();
  const ordersCollection = db.collection("orders");

  // 1. Fetch current order to validate existence and state
  const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  // 2. Check for existing booking or in-progress state
  const existingCourier = order.courier;
  if (existingCourier) {
    if (existingCourier.bookingState === "created") {
      return res.status(409).json({
        success: false,
        message: `Parcel is already booked for this order with Consignment ID: ${existingCourier.consignmentId}`,
        consignmentId: existingCourier.consignmentId,
        trackingCode: existingCourier.trackingCode,
      });
    }

    if (existingCourier.bookingState === "processing") {
      return res.status(409).json({
        success: false,
        message: "A booking request for this order is currently in progress. Please wait.",
      });
    }

    if (existingCourier.bookingState === "unknown") {
      return res.status(409).json({
        success: false,
        message: "Previous booking attempt timed out and is in an unknown state. Please refresh status or verify with Steadfast portal before retrying.",
      });
    }
  }

  // 3. Customer & delivery info validation (allow admin edits from modal payload)
  const recipientName = (req.body.recipientName || order.customerName || "").trim();
  const rawPhone = req.body.recipientPhone || order.phone || "";
  const recipientPhone = sanitizeBdPhone(rawPhone);
  const recipientAddress = (req.body.recipientAddress || order.address || "").trim();
  const note = (req.body.note || order.note || "").trim();

  if (!recipientName) {
    return res.status(400).json({
      success: false,
      message: "Recipient name is required",
    });
  }

  if (!recipientPhone) {
    return res.status(400).json({
      success: false,
      message: `Invalid recipient phone number ("${rawPhone}"). Must be an 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).`,
    });
  }

  if (!recipientAddress || recipientAddress.length < 5) {
    return res.status(400).json({
      success: false,
      message: "Recipient address must be at least 5 characters long and contain delivery area details",
    });
  }

  // 4. Financial COD Calculation
  const totalPrice = Number(order.totalPrice) || 0;
  const deliveryCharge = Number(
    req.body.deliveryCharge !== undefined ? req.body.deliveryCharge : (order.deliveryCharge || 0)
  );
  const alreadyPaid = Number(
    req.body.alreadyPaid !== undefined ? req.body.alreadyPaid : (order.alreadyPaid || 0)
  );
  const discount = Number(order.discount || 0);

  let codAmount = Math.max(0, Math.round(totalPrice + deliveryCharge - alreadyPaid - discount));

  // Allow explicit COD override from admin if provided
  if (req.body.codAmount !== undefined) {
    const overrideCod = Number(req.body.codAmount);
    if (isNaN(overrideCod) || overrideCod < 0) {
      return res.status(400).json({
        success: false,
        message: "COD Amount must be a valid non-negative number",
      });
    }
    codAmount = Math.round(overrideCod);
  }

  // 5. Generate human-readable invoice reference matching PDF invoice
  const invoice =
    order.invoiceNumber || `TX-${order._id.toString().slice(-8).toUpperCase()}`;

  // Item description summary
  const itemDescription = (order.products || [])
    .map((p) => `${p.title} (x${p.quantity || 1})`)
    .join(", ")
    .slice(0, 180);

  // 6. ATOMIC LOCK: Mark as processing to prevent any concurrent attempt
  const lockResult = await ordersCollection.findOneAndUpdate(
    {
      _id: new ObjectId(id),
      $or: [
        { "courier.bookingState": { $in: ["not_created", "failed", null] } },
        { courier: { $exists: false } },
      ],
    },
    {
      $set: {
        "courier.provider": "steadfast",
        "courier.bookingState": "processing",
        "courier.lastAttemptAt": new Date(),
        "courier.error": null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!lockResult) {
    return res.status(409).json({
      success: false,
      message: "Order was locked by another simultaneous booking request. Please refresh.",
    });
  }

  // 7. Dispatch call to Steadfast API
  try {
    const steadfastResponse = await steadfastService.createOrder({
      invoice,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress,
      cod_amount: codAmount,
      note,
      item_description: itemDescription,
    });

    const consignment = steadfastResponse.consignment || steadfastResponse.data || {};
    const consignmentId = consignment.consignment_id;
    const trackingCode = consignment.tracking_code;
    const initialStatus = consignment.status || "in_review";

    if (!consignmentId) {
      throw new Error(
        steadfastResponse.message || "Steadfast responded without a Consignment ID"
      );
    }

    const courierData = {
      provider: "steadfast",
      bookingState: "created",
      consignmentId: Number(consignmentId) || consignmentId,
      trackingCode: trackingCode || null,
      deliveryStatus: initialStatus,
      codAmount,
      deliveryCharge,
      alreadyPaid,
      invoice,
      recipientName,
      recipientPhone,
      recipientAddress,
      note,
      bookedAt: new Date(),
      lastCheckedAt: new Date(),
      error: null,
      history: [
        {
          status: initialStatus,
          timestamp: new Date(),
          source: "manual_booking",
          note: "Parcel booked by admin",
        },
      ],
    };

    // Update order in MongoDB with confirmed booking details
    await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          courier: courierData,
          deliveryCharge,
          alreadyPaid,
          // Transition order status to Shipped or Processing if currently Pending
          status: order.status === "Pending" ? "Processing" : order.status,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Parcel booked with Steadfast Courier successfully",
      data: courierData,
    });
  } catch (error) {
    // 8. Handle Timeouts vs API Errors gracefully
    const isTimeout = error.code === "ETIMEDOUT" || error.status === 504;
    const bookingState = isTimeout ? "unknown" : "failed";

    await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          "courier.bookingState": bookingState,
          "courier.error": error.message,
          "courier.lastAttemptAt": new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const statusCode = error.status || (isTimeout ? 504 : 500);
    return res.status(statusCode).json({
      success: false,
      message: isTimeout
        ? "Steadfast API timed out. Booking marked as 'unknown'. Please refresh status before retrying."
        : error.message || "Failed to create parcel on Steadfast Courier",
      bookingState,
      details: error.responseData || null,
    });
  }
};

// ==========================================
// REFRESH PARCEL DELIVERY STATUS
// ==========================================

const refreshOrderStatus = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Order ID",
    });
  }

  const db = getDB();
  const ordersCollection = db.collection("orders");

  const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  if (!order.courier || !order.courier.consignmentId) {
    return res.status(400).json({
      success: false,
      message: "This order has not been booked with Steadfast yet",
    });
  }

  try {
    const statusResponse = await steadfastService.getStatusByCid(
      order.courier.consignmentId
    );
    const newDeliveryStatus =
      statusResponse.delivery_status || statusResponse.status || null;

    if (!newDeliveryStatus) {
      throw new Error("Steadfast did not return a valid delivery status");
    }

    const previousStatus = order.courier.deliveryStatus;
    const hasStatusChanged = previousStatus !== newDeliveryStatus;

    const updateOps = {
      $set: {
        "courier.deliveryStatus": newDeliveryStatus,
        "courier.lastCheckedAt": new Date(),
        updatedAt: new Date(),
      },
    };

    // Keep audit history of transitions
    if (hasStatusChanged) {
      updateOps.$push = {
        "courier.history": {
          status: newDeliveryStatus,
          timestamp: new Date(),
          source: "admin_refresh",
          note: `Delivery status changed from "${previousStatus}" to "${newDeliveryStatus}"`,
        },
      };

      // Automatically sync main order status if delivered or cancelled
      if (newDeliveryStatus === "delivered" && order.status !== "Delivered") {
        updateOps.$set.status = "Delivered";
      } else if (newDeliveryStatus === "cancelled" && order.status !== "Cancelled") {
        updateOps.$set.status = "Cancelled";
      }
    }

    await ordersCollection.updateOne({ _id: new ObjectId(id) }, updateOps);

    return res.json({
      success: true,
      message: hasStatusChanged
        ? `Status updated to ${newDeliveryStatus}`
        : "Status is already up to date",
      deliveryStatus: newDeliveryStatus,
      lastCheckedAt: new Date(),
      hasChanged: hasStatusChanged,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to retrieve status from Steadfast Courier",
    });
  }
};

// ==========================================
// GET STEADFAST MERCHANT BALANCE
// ==========================================

const getBalance = async (req, res) => {
  try {
    const data = await steadfastService.getBalance();
    return res.json({
      success: true,
      currentBalance: data.current_balance ?? 0,
      raw: data,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to retrieve Steadfast account balance",
    });
  }
};

// ==========================================
// GET PARCELS (COURIER MANAGEMENT DASHBOARD)
// ==========================================

const getParcels = async (req, res) => {
  const db = getDB();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const skip = (page - 1) * limit;

  const { search, deliveryStatus, bookingState, startDate, endDate } = req.query;

  // Base filter: Orders that have courier object or are booked
  const filter = {
    $or: [
      { "courier.consignmentId": { $ne: null } },
      { "courier.bookingState": { $in: ["created", "processing", "unknown", "failed"] } },
    ],
  };

  if (deliveryStatus && deliveryStatus !== "All") {
    filter["courier.deliveryStatus"] = deliveryStatus;
  }

  if (bookingState && bookingState !== "All") {
    filter["courier.bookingState"] = bookingState;
  }

  if (startDate || endDate) {
    filter["courier.bookedAt"] = {};
    if (startDate) filter["courier.bookedAt"].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter["courier.bookedAt"].$lte = end;
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    const isNum = !isNaN(Number(term));

    const searchConditions = [
      { customerName: { $regex: term, $options: "i" } },
      { phone: { $regex: term, $options: "i" } },
      { "courier.trackingCode": { $regex: term, $options: "i" } },
      { "courier.invoice": { $regex: term, $options: "i" } },
    ];

    if (ObjectId.isValid(term) && term.length === 24) {
      searchConditions.push({ _id: new ObjectId(term) });
    }

    if (isNum) {
      searchConditions.push({ "courier.consignmentId": Number(term) });
    }

    filter.$and = filter.$and || [];
    filter.$and.push({ $or: searchConditions });
  }

  const parcels = await db
    .collection("orders")
    .find(filter)
    .sort({ "courier.bookedAt": -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await db.collection("orders").countDocuments(filter);

  // Compute aggregate metrics
  const allBooked = await db
    .collection("orders")
    .find({ "courier.consignmentId": { $ne: null } })
    .project({ "courier.deliveryStatus": 1, "courier.codAmount": 1, status: 1 })
    .toArray();

  const stats = {
    total: allBooked.length,
    inReview: allBooked.filter((o) => o.courier?.deliveryStatus === "in_review").length,
    pending: allBooked.filter((o) => o.courier?.deliveryStatus === "pending").length,
    inTransit: allBooked.filter((o) =>
      ["in_review", "pending", "hold"].includes(o.courier?.deliveryStatus)
    ).length,
    delivered: allBooked.filter((o) => o.courier?.deliveryStatus === "delivered").length,
    partialDelivered: allBooked.filter((o) => o.courier?.deliveryStatus === "partial_delivered").length,
    cancelled: allBooked.filter((o) => o.courier?.deliveryStatus === "cancelled").length,
    returned: allBooked.filter((o) =>
      ["return", "returned", "cancelled"].includes(o.courier?.deliveryStatus)
    ).length,
    totalCod: allBooked.reduce((acc, o) => acc + (Number(o.courier?.codAmount) || 0), 0),
    deliveredCod: allBooked
      .filter((o) => o.courier?.deliveryStatus === "delivered")
      .reduce((acc, o) => acc + (Number(o.courier?.codAmount) || 0), 0),
  };

  res.json({
    success: true,
    data: parcels,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats,
  });
};

// ==========================================
// STEADFAST INBOUND WEBHOOK
// ==========================================

const handleWebhook = async (req, res) => {
  // 1. Verify Webhook Secret if configured
  const webhookSecret = process.env.STEADFAST_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = req.headers.authorization || "";
    const expected = `Bearer ${webhookSecret}`;

    if (authHeader !== expected && authHeader !== webhookSecret) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized webhook request",
      });
    }
  }

  const payload = req.body || {};
  const consignmentId = payload.consignment_id;
  const newStatus = payload.status;
  const invoice = payload.invoice;

  if (!consignmentId && !invoice) {
    return res.status(400).json({
      success: false,
      message: "Missing consignment_id or invoice in webhook payload",
    });
  }

  const db = getDB();
  const ordersCollection = db.collection("orders");

  // Query order by consignmentId or invoice
  const query = {
    $or: [
      { "courier.consignmentId": Number(consignmentId) },
      { "courier.consignmentId": String(consignmentId) },
    ],
  };

  if (invoice) {
    query.$or.push({ "courier.invoice": invoice });
  }

  const order = await ordersCollection.findOne(query);

  if (!order) {
    // Acknowledge receipt to avoid webhook spam, but note not found
    return res.status(200).json({
      success: true,
      message: "Order not found in database; acknowledged",
    });
  }

  // Idempotency: skip if status is identical
  if (order.courier?.deliveryStatus === newStatus) {
    return res.status(200).json({
      success: true,
      message: "Status already up to date",
    });
  }

  const updateOps = {
    $set: {
      "courier.deliveryStatus": newStatus,
      "courier.lastCheckedAt": new Date(),
      updatedAt: new Date(),
    },
    $push: {
      "courier.history": {
        status: newStatus,
        timestamp: new Date(),
        source: "webhook",
        note: `Status updated via Steadfast webhook to "${newStatus}"`,
      },
    },
  };

  if (newStatus === "delivered" && order.status !== "Delivered") {
    updateOps.$set.status = "Delivered";
  } else if (newStatus === "cancelled" && order.status !== "Cancelled") {
    updateOps.$set.status = "Cancelled";
  }

  await ordersCollection.updateOne({ _id: order._id }, updateOps);

  return res.status(200).json({
    success: true,
    message: "Parcel status updated successfully via webhook",
  });
};

module.exports = {
  createParcel,
  refreshOrderStatus,
  getBalance,
  getParcels,
  handleWebhook,
};
