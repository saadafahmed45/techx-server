const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const {
  createCollection,
  getCollections,
  getSingleCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collectionController");


// CREATE COLLECTION
router.post(
  "/",
  upload.single("image"),
  createCollection
);


// GET ALL COLLECTIONS
router.get("/", getCollections);


// GET SINGLE COLLECTION
router.get("/:id", getSingleCollection);


// UPDATE COLLECTION
router.put(
  "/:id",
  upload.single("image"),
  updateCollection
);


// DELETE COLLECTION
router.delete(
  "/:id",
  deleteCollection
);

module.exports = router;
