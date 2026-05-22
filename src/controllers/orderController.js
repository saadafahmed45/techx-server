// ==========================================
// controllers/orderController.js
// ==========================================

const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

// ==========================================
// CREATE ORDER
// ==========================================

const createOrder = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const ordersCollection =
      db.collection("orders");

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

    if (
      !customerName ||
      !phone ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer information missing",
      });
    }

    if (
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Products are required",
      });
    }

    // ORDER OBJECT

    const order = {
      customerName,

      email: email || "",

      phone,

      address,

      products: products.map(
        (item) => ({
          _id: item._id || "",

          title:
            item.title || "",

          image:
            item.images?.[0] ||
            "",

          price:
            Number(item.price) ||
            0,

          quantity:
            Number(
              item.quantity
            ) || 1,
        })
      ),

      totalPrice:
        Number(totalPrice) || 0,

      paymentMethod:
        paymentMethod ||
        "Cash On Delivery",

      status:
        status || "Pending",

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    // INSERT

    const result =
      await ordersCollection.insertOne(
        order
      );

    // RESPONSE

    res.status(201).json({
      success: true,

      message:
        "Order placed successfully",

      insertedId:
        result.insertedId,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message:
        error.message,
    });
  }
};

// ==========================================
// GET ALL ORDERS
// ==========================================

const getOrders = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const orders =
      await db
        .collection("orders")
        .find()
        .sort({
          createdAt: -1,
        })
        .toArray();

    res.json(orders);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message:
        error.message,
    });
  }
};

// ==========================================
// GET SINGLE ORDER
// ==========================================

const getSingleOrder =
  async (req, res) => {
    try {
      const id =
        req.params.id;

      if (
        !ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid Order ID",
        });
      }

      const db = getDB();

      const order =
        await db
          .collection(
            "orders"
          )
          .findOne({
            _id: new ObjectId(
              id
            ),
          });

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found",
        });
      }

      res.json(order);
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

// ==========================================
// UPDATE ORDER STATUS
// ==========================================

const updateOrderStatus =
  async (req, res) => {
    try {
      const id =
        req.params.id;

      const {
        status,
      } = req.body;

      if (
        !ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid Order ID",
        });
      }

      const db = getDB();

      await db
        .collection(
          "orders"
        )
        .updateOne(
          {
            _id: new ObjectId(
              id
            ),
          },
          {
            $set: {
              status:
                status ||
                "Pending",

              updatedAt:
                new Date(),
            },
          }
        );

      const updatedOrder =
        await db
          .collection(
            "orders"
          )
          .findOne({
            _id: new ObjectId(
              id
            ),
          });

      res.json({
        success: true,

        message:
          "Order updated successfully",

        data: updatedOrder,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

// ==========================================
// DELETE ORDER
// ==========================================

const deleteOrder = async (
  req,
  res
) => {
  try {
    const id =
      req.params.id;

    if (
      !ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid Order ID",
      });
    }

    const db = getDB();

    const result =
      await db
        .collection(
          "orders"
        )
        .deleteOne({
          _id: new ObjectId(
            id
          ),
        });

    if (
      result.deletedCount ===
      0
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found",
      });
    }

    res.json({
      success: true,

      message:
        "Order deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message:
        error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getSingleOrder,
  updateOrderStatus,
  deleteOrder,
};