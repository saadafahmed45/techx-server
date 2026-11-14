// ==========================================
// routes/orderRoutes.js
// ==========================================

const express = require("express");
const { verifyJWT, verifyAdmin } = require("../middleware/authMiddleware");

const {
  createOrder,
  getOrders,
  getSingleOrder,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");

const router = express.Router();

// CREATE ORDER (Public: Customer checkout)
router.post("/", createOrder);

// GET ALL ORDERS (Admin Only)
router.get("/", verifyJWT, verifyAdmin, getOrders);

// GET SINGLE ORDER (Public: Order tracking / invoice)
router.get("/:id", getSingleOrder);

// UPDATE STATUS (Admin Only)
router.patch("/:id", verifyJWT, verifyAdmin, updateOrderStatus);
router.put("/:id", verifyJWT, verifyAdmin, updateOrderStatus);

// DELETE ORDER (Admin Only)
router.delete("/:id", verifyJWT, verifyAdmin, deleteOrder);

module.exports = router;