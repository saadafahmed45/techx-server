// ==========================================
// routes/heroSliderRoutes.js
// ==========================================

const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  createHeroSlider,
  getHeroSliders,
  getSingleHeroSlider,
  updateHeroSlider,
  deleteHeroSlider,
} = require("../controllers/HeroSliderController");

// CREATE
router.post(
  "/",
  upload.single("image"),
  createHeroSlider
);

// GET ALL
router.get("/", getHeroSliders);

// GET SINGLE
router.get("/:id", getSingleHeroSlider);

// UPDATE
router.put(
  "/:id",
  upload.single("image"),
  updateHeroSlider
);

// DELETE
router.delete("/:id", deleteHeroSlider);

module.exports = router;