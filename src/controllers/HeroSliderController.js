// ==========================================
// controllers/HeroSliderController.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const isValidObjectId = require("../utils/objectId");
const { deleteFromCloudinary } = require("../utils/cloudinaryCleanup");

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

// ==========================================
// CREATE SLIDER
// ==========================================

const createHeroSlider = async (req, res) => {
  const db = getDB();

  const imageUrl = req.file?.path || "";
  const badges = parseJSON(req.body.badges, []);

  const slider = {
    title: req.body.title || "",
    description: req.body.description || "",
    badge: req.body.badge || "",
    buttonText: req.body.buttonText || "SHOP NOW",
    image: imageUrl,
    badges, // array e.g. ["New Arrival", "Hot Deal"]
    status: req.body.status || "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("heroSliders").insertOne(slider);

  res.status(201).json({
    success: true,
    message: "Hero slider created successfully",
    insertedId: result.insertedId,
  });
};

// ==========================================
// GET ALL
// ==========================================

const getHeroSliders = async (req, res) => {
  const db = getDB();

  const sliders = await db
    .collection("heroSliders")
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  res.json(sliders);
};

// ==========================================
// GET SINGLE
// ==========================================

const getSingleHeroSlider = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid slider id",
    });
  }

  const db = getDB();
  const slider = await db.collection("heroSliders").findOne({
    _id: new ObjectId(id),
  });

  if (!slider) {
    return res.status(404).json({
      success: false,
      message: "Slider not found",
    });
  }

  res.json(slider);
};

// ==========================================
// UPDATE
// ==========================================

const updateHeroSlider = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid slider id",
    });
  }

  const db = getDB();

  // Build the update payload dynamically based on what is provided in the request
  const updateData = {
    updatedAt: new Date(),
  };

  if (req.body.title !== undefined) updateData.title = req.body.title;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.badge !== undefined) updateData.badge = req.body.badge;
  if (req.body.buttonText !== undefined) updateData.buttonText = req.body.buttonText;
  if (req.body.status !== undefined) updateData.status = req.body.status;

  if (req.body.badges !== undefined) {
    updateData.badges = parseJSON(req.body.badges, []);
  }

  if (req.file?.path) {
    updateData.image = req.file.path;
  }

  // OPTIMIZATION: Execute in a single DB round-trip using findOneAndUpdate returning original doc
  const oldSlider = await db
    .collection("heroSliders")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "before" }
    );

  if (!oldSlider) {
    return res.status(404).json({
      success: false,
      message: "Slider not found",
    });
  }

  // Cloudinary media cleanup: if a new image was uploaded, delete the old image asynchronously
  if (req.file?.path && oldSlider.image) {
    deleteFromCloudinary(oldSlider.image).catch((err) =>
      console.error("⚠️ Failed to clean up old hero slider image from Cloudinary:", err.message)
    );
  }

  const updatedSlider = {
    ...oldSlider,
    ...updateData,
  };

  res.json({
    success: true,
    message: "Slider updated successfully",
    data: updatedSlider,
  });
};

// ==========================================
// DELETE
// ==========================================

const deleteHeroSlider = async (req, res) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid slider id",
    });
  }

  const db = getDB();

  // Find and delete the hero slider in a single DB operation to fetch the image URL for Cloudinary deletion
  const slider = await db
    .collection("heroSliders")
    .findOneAndDelete({ _id: new ObjectId(id) });

  if (!slider) {
    return res.status(404).json({
      success: false,
      message: "Slider not found",
    });
  }

  // Cloudinary media cleanup: delete image asynchronously
  if (slider.image) {
    deleteFromCloudinary(slider.image).catch((err) =>
      console.error("⚠️ Failed to delete hero slider image from Cloudinary:", err.message)
    );
  }

  res.json({
    success: true,
    message: "Slider deleted successfully",
  });
};

module.exports = {
  createHeroSlider,
  getHeroSliders,
  getSingleHeroSlider,
  updateHeroSlider,
  deleteHeroSlider,
};