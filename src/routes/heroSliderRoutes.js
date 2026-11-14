// ==========================================
// routes/heroSliderRoutes.js
// ==========================================

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { verifyJWT, verifyAdmin } = require("../middleware/authMiddleware");

const {
  createHeroSlider,
  getHeroSliders,
  getSingleHeroSlider,
  updateHeroSlider,
  deleteHeroSlider,
  getSliderSettings,
  updateSliderSettings,
  reorderHeroSliders,
} = require("../controllers/HeroSliderController");

// SETTINGS (Public GET, Admin PUT)
router.get("/settings", getSliderSettings);
router.put("/settings", verifyJWT, verifyAdmin, updateSliderSettings);

// BATCH REORDER (Admin Only)
router.put("/reorder", verifyJWT, verifyAdmin, reorderHeroSliders);

// CREATE (Admin Only)
router.post(
  "/",
  verifyJWT,
  verifyAdmin,
  upload.single("image"),
  createHeroSlider
);

// GET ALL (Public)
router.get("/", getHeroSliders);

// GET SINGLE (Public)
router.get("/:id", getSingleHeroSlider);

// UPDATE (Admin Only)
router.put(
  "/:id",
  verifyJWT,
  verifyAdmin,
  upload.single("image"),
  updateHeroSlider
);

// DELETE (Admin Only)
router.delete("/:id", verifyJWT, verifyAdmin, deleteHeroSlider);

module.exports = router;