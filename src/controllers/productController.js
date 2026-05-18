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

    const productCollection =
      db.collection("products");

    // ======================================
    // IMAGES
    // ======================================
    const imageUrls =
      req.files?.map(
        (file) => file.path
      ) || [];

    // ======================================
 

    // ======================================
    // COLLECTIONS OBJECT
    // FRONTEND থেকে full object আসবে
    // ======================================
    const collections = parseJSON(
      req.body.collections,
      []
    );

    // ======================================
    // PRODUCT OBJECT
    // ======================================
    const product = {
      title:
        req.body.title || "",

      slug:
        req.body.slug || "",

      description:
        req.body.description ||
        "",

      vendor:
        req.body.vendor || "",

      price:
        Number(req.body.price) ||
        0,

      productType:
        req.body.productType ||
        "",

      status:
        req.body.status ||
        "draft",

      featured:
        req.body.featured ===
        "true",

      stock:
        Number(req.body.stock) ||
        0,

      tags: req.body.tags
        ? req.body.tags
            .split(",")
            .map((tag) =>
              tag.trim()
            )
        : [],

      images: imageUrls,


      // ==================================
      // COLLECTION OBJECT SAVE
      // ==================================
      collections,

      // ==================================
      // RATING
      // ==================================
      rating: {
        average: 0,
        count: 0,
        reviews: [],
      },

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    // ======================================
    // INSERT
    // ======================================
    const result =
      await productCollection.insertOne(
        product
      );

    res.status(201).json({
      success: true,
      message:
        "Product created successfully",

      insertedId:
        result.insertedId,
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
const getProducts = async (
  req,
  res
) => {
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
const getSingleProduct =
  async (req, res) => {
    try {
      const id = req.params.id;

      // ====================================
      // SUPPORT ID OR SLUG
      // ====================================
      const query =
        isValidObjectId(id)
          ? {
              _id: new ObjectId(
                id
              ),
            }
          : {
              slug: id,
            };

      const db = getDB();

      const product = await db
        .collection("products")
        .findOne(query);

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Product Not Found",
          });
      }

      res.json(product);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message:
          error.message,
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
    // IMAGES
    // ======================================

    const imageUrls =
      req.files?.map(
        (file) => file.path
      ) || [];

    // ======================================
    // COLLECTIONS
    // ======================================

    const collections = parseJSON(
      req.body.collections,
      []
    );

    // ======================================
    // UPDATE DATA
    // ======================================

    const updateData = {
      title:
        req.body.title || "",

      slug:
        req.body.slug || "",

      description:
        req.body.description || "",

      vendor:
        req.body.vendor || "",

      price:
        Number(req.body.price) || 0,

      productType:
        req.body.productType || "",

      status:
        req.body.status || "draft",

      featured:
        req.body.featured === "true" ||
        req.body.featured === true,

      stock:
        Number(req.body.stock) || 0,

      tags: req.body.tags
        ? req.body.tags
            .split(",")
            .map((tag) =>
              tag.trim()
            )
        : [],

      collections,

      updatedAt: new Date(),
    };

    // ======================================
    // UPDATE IMAGES ONLY IF EXISTS
    // ======================================

    if (imageUrls.length > 0) {
      updateData.images = imageUrls;
    }

    // ======================================
    // UPDATE PRODUCT
    // ======================================

    await db
      .collection("products")
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updateData,
        }
      );

    // ======================================
    // GET UPDATED PRODUCT
    // ======================================

    const updatedProduct =
      await db
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
      message: error.message,
    });
  }
};
// ==========================================
// ADD PRODUCT RATING
// ==========================================
const addProductRating =
  async (req, res) => {
    try {
      const id = req.params.id;

      if (
        !isValidObjectId(id)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid Product ID",
          });
      }

      const db = getDB();

      const { rating, comment ,customerName} =
        req.body;

      const numericRating =
        Number(rating);

      if (
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res
          .status(400)
          .json({
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
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Product not found",
          });
      }

      const oldReviews =
        product.rating?.reviews ||
        [];

      const newReview = {
        customerName: customerName || "Anonymous",
        rating: numericRating,
        comment:
          comment || "",

           

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
        total /
        updatedReviews.length;

      await db
        .collection("products")
        .updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              rating: {
                average:
                  Number(
                    average.toFixed(
                      1
                    )
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
        message:
          error.message,
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

    if (
      !isValidObjectId(id)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid Product ID",
        });
    }

    const db = getDB();

    const result = await db
      .collection("products")
      .deleteOne({
        _id: new ObjectId(id),
      });

    if (
      result.deletedCount === 0
    ) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Product Not Found",
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