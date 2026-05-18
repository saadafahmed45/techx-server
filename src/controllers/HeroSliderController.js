// ==========================================
// controllers/HeroSliderController.js
// ==========================================

const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const isValidObjectId = require("../utils/objectId");

// ==========================================
// CREATE SLIDER
// ==========================================
const createHeroSlider = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const image =
      req.file?.path || "";

    const slider = {
      title:
        req.body.title || "",

      description:
        req.body.description ||
        "",

      badge:
        req.body.badge || "",

      buttonText:
        req.body.buttonText ||
        "SHOP NOW",

      image,

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    const result = await db
      .collection("heroSliders")
      .insertOne(slider);

    res.status(201).json({
      success: true,
      message:
        "Hero slider created successfully",
      insertedId:
        result.insertedId,
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
// GET ALL SLIDERS
// ==========================================
const getHeroSliders = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const sliders = await db
      .collection("heroSliders")
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.json(sliders);
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
// GET SINGLE SLIDER
// ==========================================
const getSingleHeroSlider =
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
              "Invalid slider id",
          });
      }

      const db = getDB();

      const slider = await db
        .collection(
          "heroSliders"
        )
        .findOne({
          _id: new ObjectId(id),
        });

      if (!slider) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Slider not found",
          });
      }

      res.json(slider);
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
// UPDATE SLIDER
// ==========================================
const updateHeroSlider =
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
              "Invalid slider id",
          });
      }

      const db = getDB();

      const updatedDoc = {
        $set: {
          title:
            req.body.title || "",

          description:
            req.body.description ||
            "",

          badge:
            req.body.badge ||
            "",

          buttonText:
            req.body.buttonText ||
            "SHOP NOW",

          updatedAt:
            new Date(),
        },
      };

      // update image
      if (req.file?.path) {
        updatedDoc.$set.image =
          req.file.path;
      }

      await db
        .collection(
          "heroSliders"
        )
        .updateOne(
          {
            _id: new ObjectId(id),
          },
          updatedDoc
        );

      const updatedSlider =
        await db
          .collection(
            "heroSliders"
          )
          .findOne({
            _id: new ObjectId(id),
          });

      res.json({
        success: true,
        message:
          "Slider updated successfully",
        data: updatedSlider,
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
// DELETE SLIDER
// ==========================================
const deleteHeroSlider =
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
              "Invalid slider id",
          });
      }

      const db = getDB();

      const result = await db
        .collection(
          "heroSliders"
        )
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
              "Slider not found",
          });
      }

      res.json({
        success: true,
        message:
          "Slider deleted successfully",
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

module.exports = {
  createHeroSlider,
  getHeroSliders,
  getSingleHeroSlider,
  updateHeroSlider,
  deleteHeroSlider,
};