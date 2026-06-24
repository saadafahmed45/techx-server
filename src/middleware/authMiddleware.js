const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const verifyJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: No token provided",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "techx_shop_jwt_secret_key_2026");
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    const db = getDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.id) });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by the administrator",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Admin access required",
    });
  }
  next();
};

module.exports = {
  verifyJWT,
  verifyAdmin,
};
