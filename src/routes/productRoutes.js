// ==========================================
// routes/productRoutes.js
// ==========================================

const express =
  require("express");

const router =
  express.Router();

const upload = require(
  "../middleware/upload"
);

const {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  addProductRating,
} = require(
  "../controllers/productController"
);

// CREATE
router.post(
  "/",
  upload.array("images", 5),
  createProduct
);

// GET ALL
router.get(
  "/",
  getProducts
);

// GET SINGLE
router.get(
  "/:id",
  getSingleProduct
);

// UPDATE
router.put(
  "/:id",
  upload.array("images", 5),
  updateProduct
);

// DELETE
router.delete(
  "/:id",
  deleteProduct
);

// PRODUCT RATING
router.post(
  "/:id/rating",
  addProductRating
);

module.exports = router;