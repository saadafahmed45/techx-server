const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const { getDB } = require("../config/db");

// ==========================================
// GET ALL USERS (PAGINATION, SEARCH, FILTER)
// ==========================================
const getUsers = async (req, res, next) => {
  try {
    const db = getDB();
    const userCollection = db.collection("users");

    // Extract query parameters
    const { search, role, status, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search query (matches name or email case-insensitively)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Role filter
    if (role && role !== "all") {
      query.role = role;
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    const pageNumber = Math.max(1, parseInt(page));
    const limitNumber = Math.max(1, parseInt(limit));
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch users (project out passwords for security)
    const users = await userCollection
      .find(query, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .toArray();

    // Total count for pagination metadata
    const totalUsers = await userCollection.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        total: totalUsers,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(totalUsers / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SINGLE USER DETAILS
// ==========================================
const getSingleUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const db = getDB();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE USER MANUALLY (ADMIN ONLY)
// ==========================================
const createUser = async (req, res, next) => {
  try {
    const db = getDB();
    const userCollection = db.collection("users");
    const { name, email, password, role, status, photoURL } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await userCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      photoURL: photoURL || "",
      role: role || "user",
      status: status || "active",
      createdAt: new Date(),
    };

    const result = await userCollection.insertOne(newUser);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE USER DETAILS (ADMIN ONLY)
// ==========================================
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    const db = getDB();
    const userCollection = db.collection("users");
    const { name, email, role, status, photoURL } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    // Check if update email already exists on a different user
    if (email) {
      const emailUser = await userCollection.findOne({
        email: email.toLowerCase(),
        _id: { $ne: new ObjectId(id) },
      });
      if (emailUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken by another account",
        });
      }
    }

    const updatedUser = await userCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after", projection: { password: 0 } }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PATCH USER STATUS (BLOCK/UNBLOCK - ADMIN ONLY)
// ==========================================
const changeUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 'active' or 'blocked'.",
      });
    }

    // Safety check: Cannot block self
    if (id === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Action denied: You cannot change your own admin status",
      });
    }

    const db = getDB();
    const userCollection = db.collection("users");

    const updatedUser = await userCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status } },
      { returnDocument: "after", projection: { password: 0 } }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: `User status changed to ${status}`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE USER SAFELY (ADMIN ONLY)
// ==========================================
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID format",
      });
    }

    // Safety check: Cannot delete self
    if (id === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Action denied: You cannot delete your own admin account",
      });
    }

    const db = getDB();
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getSingleUser,
  createUser,
  updateUser,
  changeUserStatus,
  deleteUser,
};
