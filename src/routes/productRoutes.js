const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const {
  createProduct,
  getProducts,
  getSingleProduct,
  deleteProduct,
  addProductRating,
} = require("../controllers/productController");

// ===================================
// CREATE PRODUCT
// ===================================
router.post(
  "/",
  upload.array("images", 5),
  createProduct
);

// ===================================
// GET PRODUCTS
// ===================================
router.get("/", getProducts);

// ===================================
// GET SINGLE PRODUCT
// ===================================
router.get("/:id", getSingleProduct);

// ===================================
// DELETE PRODUCT
// ===================================
router.delete("/:id", deleteProduct);

// ===================================
// ADD REVIEW & RATING
// ===================================
router.post(
  "/:id/rating",
  addProductRating
);

module.exports = router;