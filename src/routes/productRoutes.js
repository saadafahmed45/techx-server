// ==========================================
// routes/productRoutes.js
// ==========================================

const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  addProductRating,
} = require("../controllers/productController");

const router = express.Router();

// ==========================================
// MULTER STORAGE
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

// ==========================================
// FILE FILTER
// ==========================================
const fileFilter = (
  req,
  file,
  cb
) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only jpg, png, webp allowed"
      ),
      false
    );
  }
};

// ==========================================
// MULTER CONFIG
// ==========================================
const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter,
});

// ==========================================
// ROUTES
// ==========================================

// GET ALL PRODUCTS
router.get("/", getProducts);

// GET SINGLE PRODUCT
router.get("/:id", getSingleProduct);

// CREATE PRODUCT
router.post(
  "/",
  upload.array("images", 10),
  createProduct
);

// UPDATE PRODUCT
router.put(
  "/:id",
  upload.array("images", 10),
  updateProduct
);

// DELETE PRODUCT
router.delete("/:id", deleteProduct);

// ADD RATING
router.post(
  "/:id/rating",
  addProductRating
);

module.exports = router;