// ==========================================
// routes/collectionRoutes.js
// ==========================================

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { verifyJWT, verifyAdmin } = require("../middleware/authMiddleware");

const {
  createCollection,
  getCollections,
  getSingleCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collectionController");

// CREATE (Admin Only)
router.post(
  "/",
  verifyJWT,
  verifyAdmin,
  upload.single("image"),
  createCollection
);

// GET ALL (Public)
router.get(
  "/",
  getCollections
);

// GET SINGLE (Public)
router.get(
  "/:id",
  getSingleCollection
);

// UPDATE (Admin Only)
router.put(
  "/:id",
  verifyJWT,
  verifyAdmin,
  upload.single("image"),
  updateCollection
);

// DELETE (Admin Only)
router.delete(
  "/:id",
  verifyJWT,
  verifyAdmin,
  deleteCollection
);

module.exports = router;