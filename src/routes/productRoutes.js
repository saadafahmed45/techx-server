// ==========================================
// routes/productRoutes.js
// ==========================================

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { verifyJWT, verifyAdmin } = require("../middleware/authMiddleware");

const {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  addProductRating,
} = require("../controllers/productController");

// CREATE (Admin Only)
router.post(
  "/",
  verifyJWT,
  verifyAdmin,
  upload.array("images", 5),
  createProduct
);

// GET ALL (Public)
router.get(
  "/",
  getProducts
);

// GET SINGLE (Public)
router.get(
  "/:id",
  getSingleProduct
);

// UPDATE (Admin Only)
router.put(
  "/:id",
  verifyJWT,
  verifyAdmin,
  upload.array("images", 5),
  updateProduct
);

// DELETE (Admin Only)
router.delete(
  "/:id",
  verifyJWT,
  verifyAdmin,
  deleteProduct
);

// PRODUCT RATING (Public / Logged-in Users)
router.post(
  "/:id/rating",
  addProductRating
);

module.exports = router;