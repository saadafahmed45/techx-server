// ==========================================
// controllers/orderController.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// ==========================================
// CREATE ORDER
// ==========================================

const createOrder = async (req, res) => {
  const db = getDB();
  const ordersCollection = db.collection("orders");

  const {
    customerName,
    email,
    phone,
    address,
    products,
    totalPrice,
    paymentMethod,
    status,
  } = req.body;

  // VALIDATION
  if (!customerName || !phone || !address) {
    return res.status(400).json({
      success: false,
      message: "Customer information missing",
    });
  }

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Products are required",
    });
  }

  // ORDER OBJECT
  const order = {
    customerName,
    email: email || "",
    phone,
    address,
    products: products.map((item) => ({
      _id: item._id || "",
      title: item.title || "",
      image: item.images?.[0] || "",
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    })),
    totalPrice: Number(totalPrice) || 0,
    paymentMethod: paymentMethod || "Cash On Delivery",
    status: status || "Pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await ordersCollection.insertOne(order);

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    insertedId: result.insertedId,
  });
};

// ==========================================
// GET ALL ORDERS
// ==========================================

const getOrders = async (req, res) => {
  const db = getDB();

  const orders = await db
    .collection("orders")
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  res.json(orders);
};

// ==========================================
// GET SINGLE ORDER
// ==========================================

const getSingleOrder = async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Order ID",
    });
  }

  const db = getDB();
  const order = await db.collection("orders").findOne({
    _id: new ObjectId(id),
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.json(order);
};

// ==========================================
// UPDATE ORDER STATUS
// ==========================================

const updateOrderStatus = async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Order ID",
    });
  }

  const db = getDB();

  // OPTIMIZATION: Execute in a single DB round-trip using findOneAndUpdate returning updated doc
  const updatedOrder = await db
    .collection("orders")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: status || "Pending",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

  if (!updatedOrder) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.json({
    success: true,
    message: "Order updated successfully",
    data: updatedOrder,
  });
};

// ==========================================
// DELETE ORDER
// ==========================================

const deleteOrder = async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Order ID",
    });
  }

  const db = getDB();
  const result = await db
    .collection("orders")
    .deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.json({
    success: true,
    message: "Order deleted successfully",
  });
};

module.exports = {
  createOrder,
  getOrders,
  getSingleOrder,
  updateOrderStatus,
  deleteOrder,
};