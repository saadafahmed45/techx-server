// ==========================================
// routes/orderRoutes.js
// ==========================================

const express = require("express");

const {
  createOrder,
  getOrders,
  getSingleOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");

const router = express.Router();

// CREATE ORDER
router.post("/", createOrder);

// GET ALL ORDERS
router.get("/", getOrders);

// GET SINGLE ORDER
router.get("/:id", getSingleOrder);

// UPDATE STATUS
router.patch("/:id", updateOrderStatus);

// DELETE ORDER
router.delete("/:id", deleteOrder);

module.exports = router;