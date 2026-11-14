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
    order: req.body.order !== undefined && req.body.order !== "" ? Number(req.body.order) : 0,
    textSize: req.body.textSize || "medium", // "small" | "medium" | "large"
    imageSize: req.body.imageSize || "cover", // "cover" | "contain"
    sliderHeight: req.body.sliderHeight || "medium", // "compact" | "medium" | "tall" | "fullscreen"
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

  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const sliders = await db
    .collection("heroSliders")
    .find(filter)
    .sort({ order: 1, createdAt: -1 })
    .toArray();

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
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
  if (req.body.order !== undefined && req.body.order !== "") {
    updateData.order = Number(req.body.order);
  }
  if (req.body.textSize !== undefined) updateData.textSize = req.body.textSize;
  if (req.body.imageSize !== undefined) updateData.imageSize = req.body.imageSize;
  if (req.body.sliderHeight !== undefined) updateData.sliderHeight = req.body.sliderHeight;

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

// ==========================================
// DEFAULT SETTINGS
// ==========================================

const DEFAULT_SLIDER_SETTINGS = {
  key: "hero_slider_settings",
  imageSize: "cover", // "cover" | "contain"
  sliderHeight: "medium", // "compact" | "medium" | "tall" | "fullscreen"
  textSize: "medium", // "small" | "medium" | "large"
  autoplaySpeed: 5500, // milliseconds
  showArrows: true,
  showDots: true,
};

// ==========================================
// GET SLIDER SETTINGS
// ==========================================

const getSliderSettings = async (req, res) => {
  try {
    const db = getDB();
    const settings = await db
      .collection("sliderSettings")
      .findOne({ key: "hero_slider_settings" });

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(settings || DEFAULT_SLIDER_SETTINGS);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to load slider settings",
    });
  }
};

// ==========================================
// UPDATE SLIDER SETTINGS (Admin Only)
// ==========================================

const updateSliderSettings = async (req, res) => {
  try {
    const db = getDB();
    const {
      imageSize,
      sliderHeight,
      textSize,
      autoplaySpeed,
      showArrows,
      showDots,
    } = req.body;

    const updatePayload = {
      updatedAt: new Date(),
    };

    if (imageSize !== undefined) updatePayload.imageSize = imageSize;
    if (sliderHeight !== undefined) updatePayload.sliderHeight = sliderHeight;
    if (textSize !== undefined) updatePayload.textSize = textSize;
    if (autoplaySpeed !== undefined) updatePayload.autoplaySpeed = Number(autoplaySpeed);
    if (showArrows !== undefined) updatePayload.showArrows = Boolean(showArrows);
    if (showDots !== undefined) updatePayload.showDots = Boolean(showDots);

    const result = await db.collection("sliderSettings").findOneAndUpdate(
      { key: "hero_slider_settings" },
      {
        $set: updatePayload,
        $setOnInsert: {
          key: "hero_slider_settings",
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    res.json({
      success: true,
      message: "Slider settings updated successfully",
      settings: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update slider settings",
    });
  }
};

// ==========================================
// REORDER HERO SLIDERS (Admin Only)
// ==========================================

const reorderHeroSliders = async (req, res) => {
  try {
    const db = getDB();
    const { items } = req.body; // Array of { id, order }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required for reordering",
      });
    }

    const bulkOps = items
      .filter((item) => isValidObjectId(item.id))
      .map((item) => ({
        updateOne: {
          filter: { _id: new ObjectId(item.id) },
          update: {
            $set: {
              order: Number(item.order) || 0,
              updatedAt: new Date(),
            },
          },
        },
      }));

    if (bulkOps.length > 0) {
      await db.collection("heroSliders").bulkWrite(bulkOps);
    }

    res.json({
      success: true,
      message: "Hero sliders reordered successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to reorder hero sliders",
    });
  }
};

module.exports = {
  createHeroSlider,
  getHeroSliders,
  getSingleHeroSlider,
  updateHeroSlider,
  deleteHeroSlider,
  getSliderSettings,
  updateSliderSettings,
  reorderHeroSliders,
};