const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB } = require("../config/db");

// Helper to generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "techx_shop_jwt_secret_key_2026",
    { expiresIn: "7d" }
  );
};

// ==========================================
// REGISTER
// ==========================================
const register = async (req, res, next) => {
  try {
    const db = getDB();
    const userCollection = db.collection("users");

    const { name, email, password, photoURL } = req.body;

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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Auto-bootstrap original admin email
    const isAdminEmail = email.toLowerCase() === "mohammadhaolader1@gmail.com";

    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      photoURL: photoURL || "",
      role: isAdminEmail ? "admin" : "user",
      status: "active", // Default status
      createdAt: new Date(),
    };

    const result = await userCollection.insertOne(newUser);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGIN
// ==========================================
const login = async (req, res, next) => {
  try {
    const db = getDB();
    const userCollection = db.collection("users");

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await userCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked by the administrator",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    // Save JWT in HTTP Only Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Remove password from response
    const { password: _, ...userData } = user;

    res.json({
      success: true,
      message: "Logged in successfully",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGOUT
// ==========================================
const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ME (Get logged-in user profile details)
// ==========================================
const me = async (req, res, next) => {
  try {
    // req.user is set by verifyJWT middleware
    const { password: _, ...userData } = req.user;
    res.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GOOGLE LOGIN (HYBRID SYSTEM)
// ==========================================
const googleLogin = async (req, res, next) => {
  try {
    const db = getDB();
    const userCollection = db.collection("users");

    const { name, email, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required from Google Auth",
      });
    }

    // Check if user already exists
    let user = await userCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Auto-bootstrap original admin email
      const isAdminEmail = email.toLowerCase() === "mohammadhaolader1@gmail.com";

      // Create new user (signed up with Google, password is set to empty/placeholder since it's not used)
      const newUser = {
        name: name || "Google User",
        email: email.toLowerCase(),
        photoURL: photoURL || "",
        role: isAdminEmail ? "admin" : "user",
        status: "active",
        createdAt: new Date(),
      };

      const result = await userCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      if (user.status === "blocked") {
        return res.status(403).json({
          success: false,
          message: "Your account has been blocked by the administrator",
        });
      }

      // Sync avatar or name if changed in Google Account
      const updateData = {};
      if (name && user.name !== name) updateData.name = name;
      if (photoURL && user.photoURL !== photoURL) updateData.photoURL = photoURL;

      if (Object.keys(updateData).length > 0) {
        await userCollection.updateOne({ _id: user._id }, { $set: updateData });
        user = { ...user, ...updateData };
      }
    }

    // Generate JWT
    const token = generateToken(user._id);

    // Save JWT in HTTP Only Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const { password: _, ...userData } = user;

    res.json({
      success: true,
      message: "Logged in with Google successfully",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  me,
  googleLogin,
};
