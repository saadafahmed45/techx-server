// ==========================================
// routes/collectionRoutes.js
// ==========================================

const express =
  require("express");

const router =
  express.Router();

const upload = require(
  "../middleware/upload"
);

const {
  createCollection,
  getCollections,
  getSingleCollection,
  updateCollection,
  deleteCollection,
} = require(
  "../controllers/collectionController"
);

// CREATE
router.post(
  "/",
  upload.single("image"),
  createCollection
);

// GET ALL
router.get(
  "/",
  getCollections
);

// GET SINGLE
router.get(
  "/:id",
  getSingleCollection
);

// UPDATE
router.put(
  "/:id",
  upload.single("image"),
  updateCollection
);

// DELETE
router.delete(
  "/:id",
  deleteCollection
);

module.exports = router;