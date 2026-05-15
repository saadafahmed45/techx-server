const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const isValidObjectId = require("../utils/objectId");

// ==========================================
// SAFE PARSER (STRING / JSON BOTH SUPPORT)
// ==========================================
const parseIds = (input) => {
  if (!input) return [];

  let ids = [];

  // JSON ARRAY SUPPORT
  try {
    if (typeof input === "string" && input.startsWith("[")) {
      ids = JSON.parse(input);
    } else {
      ids = input.split(",");
    }
  } catch (err) {
    ids = [];
  }

  return ids
    .map((id) => (typeof id === "object" ? id._id || id.id : id))
    .map((id) => String(id).trim())
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
};

// ==========================================
// CREATE COLLECTION
// ==========================================
const createCollection = async (req, res) => {
  try {
    const db = getDB();
    const collectionCollection = db.collection("collections");

    const imageUrl = req.file?.path || "";

    const productIds = parseIds(req.body.productIds);

    const collection = {
      name: req.body.name || "",
      description: req.body.description || "",
      imageUrl,
      slug: req.body.slug || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collectionCollection.insertOne(collection);

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
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
// GET ALL COLLECTIONS
// ==========================================
const getCollections = async (req, res) => {
  try {
    const db = getDB();

    const collections = await db
      .collection("collections")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json(collections);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SINGLE COLLECTION
// ==========================================
const getSingleCollection = async (req, res) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Collection ID",
      });
    }

    const db = getDB();

    const collection = await db
      .collection("collections")
      .findOne({ _id: new ObjectId(id) });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Collection Not Found",
      });
    }

    res.json(collection);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE COLLECTION
// ==========================================
const updateCollection = async (req, res) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Collection ID",
      });
    }

    const db = getDB();

    const updatedData = {
      updatedAt: new Date(),
    };

    if (req.body.name !== undefined) {
      updatedData.name = req.body.name;
    }

    if (req.body.description !== undefined) {
      updatedData.description = req.body.description;
    }

    if (req.file?.path) {
      updatedData.imageUrl = req.file.path;
    }

    // ✅ FIXED PRODUCT IDS (IMPORTANT)
    if (req.body.productIds) {
      updatedData.productIds = parseIds(req.body.productIds);
    }

    const result = await db
      .collection("collections")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

    res.json({
      success: true,
      message: "Collection updated successfully",
      result,
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
// DELETE COLLECTION
// ==========================================
const deleteCollection = async (req, res) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Collection ID",
      });
    }

    const db = getDB();

    const result = await db
      .collection("collections")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Collection Not Found",
      });
    }

    res.json({
      success: true,
      message: "Collection deleted successfully",
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
  createCollection,
  getCollections,
  getSingleCollection,
  updateCollection,
  deleteCollection,
};