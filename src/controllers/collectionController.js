// ==========================================
// controllers/collectionController.js
// FULL FIXED VERSION
// ==========================================

const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

const isValidObjectId = require("../utils/objectId");

// ==========================================
// SAFE PARSER
// ==========================================

const parseCollectionsProducts = (
  input
) => {
  if (!input) return [];

  let parsed = [];

  try {
    parsed =
      typeof input === "string"
        ? JSON.parse(input)
        : input;
  } catch {
    parsed = [];
  }

  return Array.isArray(parsed)
    ? parsed.map((item) => ({
        _id: String(
          item._id ||
            item.id ||
            ""
        ),

        title:
          item.title || "",

        slug:
          item.slug || "",

        price:
          Number(
            item.price
          ) || 0,

        image:
          item.image ||
          item.images?.[0] ||
          "",

        vendor:
          item.vendor || "",

        productType:
          item.productType ||
          "",
      }))
    : [];
};

// ==========================================
// CREATE COLLECTION
// ==========================================

const createCollection = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const collectionCollection =
      db.collection(
        "collections"
      );

    // ======================================
    // IMAGE
    // ======================================

    const imageUrl =
      req.file?.path || "";

    // ======================================
    // PRODUCTS
    // ======================================

    const products =
      parseCollectionsProducts(
        req.body.products
      );

    // ======================================
    // COLLECTION OBJECT
    // ======================================

    const collection = {
      name:
        req.body.name || "",

      slug:
        req.body.slug || "",

      description:
        req.body.description ||
        "",

      imageUrl,

      products,

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    // ======================================
    // INSERT
    // ======================================

    const result =
      await collectionCollection.insertOne(
        collection
      );

    // ======================================
    // RESPONSE
    // ======================================

    res.status(201).json({
      success: true,

      message:
        "Collection created successfully",

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
// GET ALL COLLECTIONS
// ==========================================

const getCollections = async (
  req,
  res
) => {
  try {
    const db = getDB();

    const collections =
      await db
        .collection(
          "collections"
        )
        .find()
        .sort({
          createdAt: -1,
        })
        .toArray();

    res.json(collections);
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
// GET SINGLE COLLECTION
// ==========================================

const getSingleCollection =
  async (req, res) => {
    try {
      const id =
        req.params.id;

      const query =
        isValidObjectId(id)
          ? {
              _id: new ObjectId(
                id
              ),
            }
          : {
              slug: id,
            };

      const db = getDB();

      const collection =
        await db
          .collection(
            "collections"
          )
          .findOne(query);

      if (!collection) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Collection not found",
          });
      }

      res.json(collection);
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
// UPDATE COLLECTION
// ==========================================

const updateCollection = async (
  req,
  res
) => {
  try {
    const id =
      req.params.id;

    if (
      !isValidObjectId(id)
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid Collection ID",
        });
    }

    const db = getDB();

    // ======================================
    // OLD COLLECTION
    // ======================================

    const oldCollection =
      await db
        .collection(
          "collections"
        )
        .findOne({
          _id: new ObjectId(
            id
          ),
        });

    if (!oldCollection) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Collection not found",
        });
    }

    // ======================================
    // PRODUCTS
    // ======================================

    const products =
      parseCollectionsProducts(
        req.body.products
      );

    // ======================================
    // UPDATE DATA
    // ======================================

    const updateData = {
      name:
        req.body.name ??
        oldCollection.name,

      slug:
        req.body.slug ??
        oldCollection.slug,

      description:
        req.body.description ??
        oldCollection.description,

      products:
        products.length > 0
          ? products
          : oldCollection.products ||
            [],

      updatedAt:
        new Date(),
    };

    // ======================================
    // IMAGE UPDATE
    // ======================================

    if (req.file?.path) {
      updateData.imageUrl =
        req.file.path;
    } else {
      updateData.imageUrl =
        oldCollection.imageUrl ||
        "";
    }

    // ======================================
    // UPDATE
    // ======================================

    await db
      .collection(
        "collections"
      )
      .updateOne(
        {
          _id: new ObjectId(
            id
          ),
        },

        {
          $set: updateData,
        }
      );

    // ======================================
    // UPDATED DATA
    // ======================================

    const updatedCollection =
      await db
        .collection(
          "collections"
        )
        .findOne({
          _id: new ObjectId(
            id
          ),
        });

    // ======================================
    // RESPONSE
    // ======================================

    res.json({
      success: true,

      message:
        "Collection updated successfully",

      data: updatedCollection,
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
// DELETE COLLECTION
// ==========================================

const deleteCollection = async (
  req,
  res
) => {
  try {
    const id =
      req.params.id;

    if (
      !isValidObjectId(id)
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid Collection ID",
        });
    }

    const db = getDB();

    const result =
      await db
        .collection(
          "collections"
        )
        .deleteOne({
          _id: new ObjectId(
            id
          ),
        });

    if (
      result.deletedCount ===
      0
    ) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Collection not found",
        });
    }

    res.json({
      success: true,

      message:
        "Collection deleted successfully",
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
  createCollection,
  getCollections,
  getSingleCollection,
  updateCollection,
  deleteCollection,
};