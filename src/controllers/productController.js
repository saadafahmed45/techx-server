// ==========================================
// controllers/productController.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const isValidObjectId = require("../utils/objectId");
const { deleteFromCloudinary, deleteManyFromCloudinary } = require("../utils/cloudinaryCleanup");

// ==========================================
// HELPERS
// ==========================================

const parseJSON = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const parseCollections = (input) => {
  if (!input) return [];

  let collections = [];

  try {
    collections = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    collections = [];
  }

  return Array.isArray(collections)
    ? collections.map((item) => ({
        _id: String(item._id || item.id || ""),
        name: item.name || "",
        slug: item.slug || "",
        imageUrl: item.imageUrl || "",
      }))
    : [];
};

// ==========================================
// CREATE PRODUCT
// ==========================================

const createProduct = async (req, res) => {
  const db = getDB();
  const productCollection = db.collection("products");

  // IMAGES
  const imageUrls = req.files?.map((file) => file.path) || [];

  // COLLECTIONS
  const collections = parseCollections(req.body.collections);

  // featured is a JSON array sent from frontend
  const featured = parseJSON(req.body.featured, []);

  const product = {
    title: req.body.title || "",
    slug: req.body.slug || "",
    description: req.body.description || "",
    vendor: req.body.vendor || "",
    price: Number(req.body.price) || 0,
    productType: req.body.productType || "",
    status: req.body.status || "draft",
    featured,  // array e.g. ["Featured", "Best Seller"]
    stock: Number(req.body.stock) || 0,
    tags: req.body.tags
      ? req.body.tags.split(",").map((tag) => tag.trim())
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

  const result = await productCollection.insertOne(product);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    insertedId: result.insertedId,
  });
};

// ==========================================
// GET ALL PRODUCTS
// ==========================================

const getProducts = async (req, res) => {
  const db = getDB();

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;
  const { status, featured, vendor, productType, category } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (vendor) filter.vendor = { $regex: vendor, $options: "i" };
  if (productType) filter.productType = productType;
  if (featured) filter.featured = featured;

  const products = await db
    .collection("products")
    .find(filter, { projection: { "rating.reviews": 0 } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await db.collection("products").countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json({
    data: products,
    pagination: { page, limit, total, totalPages },
  });
};

// ==========================================
// GET SINGLE PRODUCT
// ==========================================

const getSingleProduct = async (req, res) => {
  const id = req.params.id;
  const query = isValidObjectId(id)
    ? { _id: new ObjectId(id) }
    : { slug: id };

  const db = getDB();
  const product = await db.collection("products").findOne(query);

  if (!product) {
    return res.status(404).json({ success: false, message: "Product Not Found" });
  }

  res.json(product);
};

// ==========================================
// UPDATE PRODUCT
// ==========================================

const updateProduct = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid Product ID" });
  }

  const db = getDB();

  // Build the update payload dynamically based on what is provided in the request
  const updateData = {
    updatedAt: new Date(),
  };

  if (req.body.title !== undefined) updateData.title = req.body.title;
  if (req.body.slug !== undefined) updateData.slug = req.body.slug;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.vendor !== undefined) updateData.vendor = req.body.vendor;
  if (req.body.price !== undefined) updateData.price = Number(req.body.price);
  if (req.body.productType !== undefined) updateData.productType = req.body.productType;
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);

  if (req.body.tags !== undefined) {
    updateData.tags = req.body.tags
      ? req.body.tags.split(",").map((tag) => tag.trim())
      : [];
  }

  if (req.body.featured !== undefined) {
    updateData.featured = parseJSON(req.body.featured, []);
  }

  // Always update collections if provided (even if empty array — allows clearing collections)
  if (req.body.collections !== undefined) {
    updateData.collections = parseCollections(req.body.collections);
  }

  // Handle images: merge existing URLs with any new uploaded files
  const newImageUrls = req.files?.map((file) => file.path) || [];
  // existingImages: array of URLs the client wants to keep
  const existingImages = parseJSON(req.body.existingImages, null);

  if (existingImages !== null) {
    // Client explicitly told us what to keep + any new uploads
    updateData.images = [...existingImages, ...newImageUrls];
  } else if (newImageUrls.length > 0) {
    // Fallback: only new uploads provided (replace all)
    updateData.images = newImageUrls;
  }
  // If neither, don't touch images field

  // OPTIMIZATION: Execute in a single DB round-trip using findOneAndUpdate returning the original doc
  const oldProduct = await db
    .collection("products")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "before" }
    );

  if (!oldProduct) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  // Cloudinary media cleanup: delete any old images that are no longer in the updated set
  if (updateData.images && oldProduct.images && oldProduct.images.length > 0) {
    const removedImages = oldProduct.images.filter(
      (url) => !updateData.images.includes(url)
    );
    if (removedImages.length > 0) {
      deleteManyFromCloudinary(removedImages).catch((err) =>
        console.error("⚠️ Failed to clean up removed product images from Cloudinary:", err.message)
      );
    }
  }

  // Build the updated product response object by merging the changes
  const updatedProduct = {
    ...oldProduct,
    ...updateData,
  };

  res.json({
    success: true,
    message: "Product updated successfully",
    data: updatedProduct,
  });
};

// ==========================================
// ADD PRODUCT RATING
// ==========================================

const addProductRating = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid Product ID" });
  }

  const db = getDB();
  const { rating, comment, customerName } = req.body;
  const numericRating = Number(rating);

  if (numericRating < 1 || numericRating > 5) {
    return res
      .status(400)
      .json({ success: false, message: "Rating must be between 1 to 5" });
  }

  const product = await db
    .collection("products")
    .findOne({ _id: new ObjectId(id) });

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const oldReviews = product.rating?.reviews || [];

  const newReview = {
    customerName: customerName || "Anonymous",
    rating: numericRating,
    comment: comment || "",
    createdAt: new Date(),
  };

  const updatedReviews = [...oldReviews, newReview];
  const total = updatedReviews.reduce((sum, item) => sum + item.rating, 0);
  const average = total / updatedReviews.length;

  await db.collection("products").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        rating: {
          average: Number(average.toFixed(1)),
          count: updatedReviews.length,
          reviews: updatedReviews,
        },
      },
    }
  );

  res.json({ success: true, message: "Rating added successfully" });
};

// ==========================================
// DELETE PRODUCT
// ==========================================

const deleteProduct = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid Product ID" });
  }

  const db = getDB();

  // Find and delete the product in a single operation to fetch its images for Cloudinary deletion
  const product = await db
    .collection("products")
    .findOneAndDelete({ _id: new ObjectId(id) });

  if (!product) {
    return res.status(404).json({ success: false, message: "Product Not Found" });
  }

  // Cloudinary media cleanup: delete associated images asynchronously
  if (product.images && product.images.length > 0) {
    deleteManyFromCloudinary(product.images).catch((err) =>
      console.error("⚠️ Failed to delete product images from Cloudinary:", err.message)
    );
  }

  res.json({ success: true, message: "Product deleted successfully" });
};

module.exports = {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  addProductRating,
  deleteProduct,
};