const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const {
  createProduct,
  getProducts,
  getSingleProduct,
  deleteProduct,
} = require("../controllers/productController");


// CREATE PRODUCT
router.post(
  "/",
  upload.array("images", 5),
  createProduct
);


// GET PRODUCTS
router.get("/", getProducts);


// GET SINGLE PRODUCT
router.get("/:id", getSingleProduct);


// DELETE PRODUCT
router.delete("/:id", deleteProduct);

module.exports = router;
