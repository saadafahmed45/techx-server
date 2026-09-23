const express = require("express");
const { register, login, logout, me, googleLogin } = require("../controllers/authController");
const { verifyJWT } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Public auth routes (with brute-force rate limiter)
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google-login", authLimiter, googleLogin);
router.post("/logout", logout);

// Protected auth route
router.get("/me", verifyJWT, me);

module.exports = router;
