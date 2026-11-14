// ==========================================
// modules/steadfast/steadfast.routes.js
// ==========================================

const express = require("express");
const { verifyJWT, verifyAdmin } = require("../../middleware/authMiddleware");
const {
  createParcel,
  refreshOrderStatus,
  getBalance,
  getParcels,
  handleWebhook,
} = require("./steadfast.controller");

const router = express.Router();

// ─── ADMIN COURIER MANAGEMENT ROUTES (PROTECTED) ─────────────
router.post("/orders/:id/create", verifyJWT, verifyAdmin, createParcel);
router.get("/orders/:id/status", verifyJWT, verifyAdmin, refreshOrderStatus);
router.get("/balance", verifyJWT, verifyAdmin, getBalance);
router.get("/parcels", verifyJWT, verifyAdmin, getParcels);

// ─── INBOUND WEBHOOK (PUBLIC ROUTE, SECURED BY WEBHOOK SECRET) ──
router.post("/webhook", handleWebhook);

module.exports = router;
