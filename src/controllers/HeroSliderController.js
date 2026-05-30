// ==========================================
// controllers/HeroSliderController.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const isValidObjectId = require("../utils/objectId");

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
  try {
    const db = getDB();

    // CLOUDINARY URL — single image like product images
    const imageUrl = req.file?.path || "";

    // badges — JSON array like product's featured
    const badges = parseJSON(req.body.badges, []);

    const slider = {
      title: req.body.title || "",
      description: req.body.description || "",
      badge: req.body.badge || "",
      buttonText: req.body.buttonText || "SHOP NOW",
      image: imageUrl,
      badges,        // array e.g. ["New Arrival", "Hot Deal"]
      status: req.body.status || "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("heroSliders")
      .insertOne(slider);

    res.status(201).json({
      success: true,
      message: "Hero slider created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET ALL
// ==========================================

const getHeroSliders = async (req, res) => {
  try {
    const db = getDB();

    const sliders = await db
      .collection("heroSliders")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json(sliders);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET SINGLE
// ==========================================

const getSingleHeroSlider = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// UPDATE
// ==========================================

const updateHeroSlider = async (req, res) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid slider id",
      });
    }

    const db = getDB();

    const oldSlider = await db
      .collection("heroSliders")
      .findOne({ _id: new ObjectId(id) });

    if (!oldSlider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    // badges — fall back to old value if nothing sent (same pattern as product's featured)
    const badges = req.body.badges
      ? parseJSON(req.body.badges, oldSlider.badges || [])
      : oldSlider.badges || [];

    const updateData = {
      title: req.body.title ?? oldSlider.title,
      description: req.body.description ?? oldSlider.description,
      badge: req.body.badge ?? oldSlider.badge,
      buttonText: req.body.buttonText ?? oldSlider.buttonText,
      badges,        // always an array, never wiped
      status: req.body.status ?? oldSlider.status,
      updatedAt: new Date(),
    };

    // IMAGE UPDATE — new file replaces old, otherwise keep existing
    if (req.file) {
      updateData.image = req.file.path;
    } else {
      updateData.image = oldSlider.image || "";
    }

    await db
      .collection("heroSliders")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedSlider = await db
      .collection("heroSliders")
      .findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: "Slider updated successfully",
      data: updatedSlider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// DELETE
// ==========================================

const deleteHeroSlider = async (req, res) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid slider id",
      });
    }

    const db = getDB();

    const result = await db
      .collection("heroSliders")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    res.json({
      success: true,
      message: "Slider deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createHeroSlider,
  getHeroSliders,
  getSingleHeroSlider,
  updateHeroSlider,
  deleteHeroSlider,
};