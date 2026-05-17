// ==========================================
// controllers/productController.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const isValidObjectId = require("../utils/objectId");

// ==========================================
// HELPER
// ==========================================
const parseJSON = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

// ==========================================
// CREATE PRODUCT
// ==========================================
const createProduct = async (req, res) => {
  try {
    const db = getDB();

    const imageUrls =
      req.files?.map((file) => file.path) || [];

    const collections = parseJSON(
      req.body.collections,
      []
    );

    const product = {
      title: req.body.title || "",

      slug: req.body.slug || "",

      description:
        req.body.description || "",

      vendor: req.body.vendor || "",

      price:
        Number(req.body.price) || 0,

      productType:
        req.body.productType || "",

      status:
        req.body.status || "draft",

      featured:
        req.body.featured === "true",

      stock:
        Number(req.body.stock) || 0,

      tags: req.body.tags
        ? req.body.tags
            .split(",")
            .map((tag) => tag.trim())
        : [],

      images: imageUrls,

      collections,

      rating: {
        average: 0,
        count: 0,
        reviews: [],
      },

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const result = await db
      .collection("products")
      .insertOne(product);

    res.status(201).json({
      success: true,
      message:
        "Product created successfully",
      insertedId: result.insertedId,
      data: product,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL PRODUCTS
// ==========================================
const getProducts = async (req, res) => {
  try {
    const db = getDB();

    const products = await db
      .collection("products")
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.json(products);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SINGLE PRODUCT
// ==========================================
const getSingleProduct = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    const query =
      isValidObjectId(id)
        ? {
            _id: new ObjectId(id),
          }
        : {
            slug: id,
          };

    const db = getDB();

    const product = await db
      .collection("products")
      .findOne(query);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    res.json(product);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE PRODUCT
// ==========================================
const updateProduct = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const db = getDB();

    // ======================================
    // EXISTING PRODUCT
    // ======================================
    const existingProduct = await db
      .collection("products")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ======================================
    // NEW IMAGES
    // ======================================
    const imageUrls =
      req.files?.map((file) => file.path) ||
      [];

    // ======================================
    // COLLECTIONS
    // ======================================
    const collections = parseJSON(
      req.body.collections,
      existingProduct.collections || []
    );

    // ======================================
    // UPDATE DOC
    // ======================================
    const updatedDoc = {
      $set: {
        title:
          req.body.title ||
          existingProduct.title,

        slug:
          req.body.slug ||
          existingProduct.slug,

        description:
          req.body.description ||
          existingProduct.description,

        vendor:
          req.body.vendor ||
          existingProduct.vendor,

        price:
          Number(req.body.price) ||
          existingProduct.price,

        productType:
          req.body.productType ||
          existingProduct.productType,

        status:
          req.body.status ||
          existingProduct.status ||
          "draft",

        featured:
          req.body.featured === "true",

        stock:
          Number(req.body.stock) ||
          existingProduct.stock,

        tags: req.body.tags
          ? req.body.tags
              .split(",")
              .map((tag) =>
                tag.trim()
              )
          : existingProduct.tags || [],

        collections,

        updatedAt: new Date(),
      },
    };

    // ======================================
    // KEEP OLD IMAGES IF NEW NOT UPLOADED
    // ======================================
    updatedDoc.$set.images =
      imageUrls.length > 0
        ? imageUrls
        : existingProduct.images || [];

    // ======================================
    // UPDATE DATABASE
    // ======================================
    await db
      .collection("products")
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        updatedDoc
      );

    // ======================================
    // GET UPDATED PRODUCT
    // ======================================
    const updatedProduct = await db
      .collection("products")
      .findOne({
        _id: new ObjectId(id),
      });

    // ======================================
    // RESPONSE
    // ======================================
    res.json({
      success: true,
      message:
        "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Something went wrong",
    });
  }
};

// ==========================================
// ADD PRODUCT RATING
// ==========================================
const addProductRating = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const db = getDB();

    const {
      rating,
      comment,
      customerName,
    } = req.body;

    const numericRating =
      Number(rating);

    if (
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be between 1 to 5",
      });
    }

    const product = await db
      .collection("products")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const oldReviews =
      product.rating?.reviews || [];

    const newReview = {
      customerName:
        customerName || "Anonymous",

      rating: numericRating,

      comment: comment || "",

      createdAt: new Date(),
    };

    const updatedReviews = [
      ...oldReviews,
      newReview,
    ];

    const total =
      updatedReviews.reduce(
        (sum, item) =>
          sum + item.rating,
        0
      );

    const average =
      total / updatedReviews.length;

    await db
      .collection("products")
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            rating: {
              average: Number(
                average.toFixed(1)
              ),

              count:
                updatedReviews.length,

              reviews:
                updatedReviews,
            },
          },
        }
      );

    res.json({
      success: true,
      message:
        "Rating added successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE PRODUCT
// ==========================================
const deleteProduct = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    const db = getDB();

    const result = await db
      .collection("products")
      .deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    res.json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  addProductRating,
  deleteProduct,
};