// ==========================================
// controllers/collectionController.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const isValidObjectId = require("../utils/objectId");
const { deleteFromCloudinary } = require("../utils/cloudinaryCleanup");

// ==========================================
// SAFE PARSER
// ==========================================

const parseCollectionsProducts = (input) => {
  if (!input) return [];

  let parsed = [];

  try {
    parsed = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    parsed = [];
  }

  return Array.isArray(parsed)
    ? parsed.map((item) => ({
        _id: String(item._id || item.id || ""),
        title: item.title || "",
        slug: item.slug || "",
        price: Number(item.price) || 0,
        image: item.image || item.images?.[0] || "",
        vendor: item.vendor || "",
        productType: item.productType || "",
      }))
    : [];
};

// ==========================================
// CREATE COLLECTION
// ==========================================

const createCollection = async (req, res) => {
  const db = getDB();
  const collectionCollection = db.collection("collections");

  const imageUrl = req.file?.path || "";
  const products = parseCollectionsProducts(req.body.products);

  const collection = {
    name: req.body.name || "",
    slug: req.body.slug || "",
    description: req.body.description || "",
    imageUrl,
    products,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collectionCollection.insertOne(collection);

  res.status(201).json({
    success: true,
    message: "Collection created successfully",
    insertedId: result.insertedId,
  });
};

// ==========================================
// GET ALL COLLECTIONS
// ==========================================

const getCollections = async (req, res) => {
  const db = getDB();

  const collections = await db
    .collection("collections")
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  res.json(collections);
};

// ==========================================
// GET SINGLE COLLECTION
// ==========================================

const getSingleCollection = async (req, res) => {
  const id = req.params.id;
  const query = isValidObjectId(id)
    ? { _id: new ObjectId(id) }
    : { slug: id };

  const db = getDB();
  const collection = await db.collection("collections").findOne(query);

  if (!collection) {
    return res.status(404).json({ success: false, message: "Collection not found" });
  }

  res.json(collection);
};

// ==========================================
// UPDATE COLLECTION
// ==========================================

const updateCollection = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid Collection ID" });
  }

  const db = getDB();

  // Build the update payload dynamically based on what is provided in the request
  const updateData = {
    updatedAt: new Date(),
  };

  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.slug !== undefined) updateData.slug = req.body.slug;
  if (req.body.description !== undefined) updateData.description = req.body.description;

  const products = parseCollectionsProducts(req.body.products);
  if (products.length > 0) {
    updateData.products = products;
  }

  if (req.file?.path) {
    updateData.imageUrl = req.file.path;
  }

  // OPTIMIZATION: Execute in a single DB round-trip using findOneAndUpdate returning original doc
  const oldCollection = await db
    .collection("collections")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "before" }
    );

  if (!oldCollection) {
    return res.status(404).json({ success: false, message: "Collection not found" });
  }

  // Cloudinary media cleanup: if a new image was uploaded, delete the old image asynchronously
  if (req.file?.path && oldCollection.imageUrl) {
    deleteFromCloudinary(oldCollection.imageUrl).catch((err) =>
      console.error("⚠️ Failed to clean up old collection image from Cloudinary:", err.message)
    );
  }

  const updatedCollection = {
    ...oldCollection,
    ...updateData,
  };

  res.json({
    success: true,
    message: "Collection updated successfully",
    data: updatedCollection,
  });
};

// ==========================================
// DELETE COLLECTION
// ==========================================

const deleteCollection = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid Collection ID" });
  }

  const db = getDB();

  // Find and delete the collection in a single DB operation to fetch the imageUrl for Cloudinary deletion
  const collection = await db
    .collection("collections")
    .findOneAndDelete({ _id: new ObjectId(id) });

  if (!collection) {
    return res.status(404).json({ success: false, message: "Collection not found" });
  }

  // Cloudinary media cleanup: delete image asynchronously
  if (collection.imageUrl) {
    deleteFromCloudinary(collection.imageUrl).catch((err) =>
      console.error("⚠️ Failed to delete collection image from Cloudinary:", err.message)
    );
  }

  res.json({ success: true, message: "Collection deleted successfully" });
};

module.exports = {
  createCollection,
  getCollections,
  getSingleCollection,
  updateCollection,
  deleteCollection,
};