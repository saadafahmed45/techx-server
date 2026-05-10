const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

const isValidObjectId = require("../utils/objectId");


// CREATE COLLECTION
const createCollection = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const collectionCollection =
      db.collection("collections");

    const imageUrl =
      req.file?.path || "";

    const collection = {
      name: req.body.name || "",
      description:
        req.body.description || "",
      imageUrl,
      createdAt: new Date(),
    };

    const result =
      await collectionCollection.insertOne(
        collection
      );

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET ALL COLLECTIONS
const getCollections = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const collections = await db
      .collection("collections")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json(collections);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET SINGLE COLLECTION
const getSingleCollection =
  async (req, res) => {
    try {
      const id = req.params.id;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message:
            "Invalid Collection ID",
        });
      }

      const db = getDB();

      const collection = await db
        .collection("collections")
        .findOne({
          _id: new ObjectId(id),
        });

      if (!collection) {
        return res.status(404).json({
          message:
            "Collection Not Found",
        });
      }

      res.json(collection);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };


// UPDATE COLLECTION
const updateCollection = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message:
          "Invalid Collection ID",
      });
    }

    const db = getDB();

    const updatedData = {
      updatedAt: new Date(),
    };

    if (req.body.name !== undefined) {
      updatedData.name = req.body.name;
    }

    if (
      req.body.description !== undefined
    ) {
      updatedData.description =
        req.body.description;
    }

    if (req.file?.path) {
      updatedData.imageUrl =
        req.file.path;
    }

    const result = await db
      .collection("collections")
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updatedData,
        }
      );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// DELETE COLLECTION
const deleteCollection = async (
  req,
  res
) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message:
          "Invalid Collection ID",
      });
    }

    const db = getDB();

    const result = await db
      .collection("collections")
      .deleteOne({
        _id: new ObjectId(id),
      });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
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
