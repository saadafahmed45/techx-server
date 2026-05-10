const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

const isValidObjectId = require("../utils/objectId");


// CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const db = getDB();

    const productCollection =
      db.collection("products");

    const imageUrls =
      req.files?.map((file) => file.path) || [];

    const product = {
      title: req.body.title || "",
      description:
        req.body.description || "",
      price: Number(req.body.price) || 0,
      images: imageUrls,
      status: req.body.status || "active",
      createdAt: new Date(),
    };

    const result =
      await productCollection.insertOne(
        product
      );

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET ALL PRODUCTS
const getProducts = async (req, res) => {
  try {
    const db = getDB();

    const products = await db
      .collection("products")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET SINGLE PRODUCT
const getSingleProduct = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid Product ID",
      });
    }

    const db = getDB();

    const product = await db
      .collection("products")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!product) {
      return res.status(404).json({
        message: "Product Not Found",
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// DELETE PRODUCT
const deleteProduct = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    const db = getDB();

    const result = await db
      .collection("products")
      .deleteOne({
        _id: new ObjectId(id),
      });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getSingleProduct,
  deleteProduct,
};
