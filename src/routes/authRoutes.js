const express = require("express");
const { register, login, logout, me, googleLogin } = require("../controllers/authController");
const { verifyJWT } = require("../middleware/authMiddleware");

const router = express.Router();

// Public auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/logout", logout);

// Protected auth route
router.get("/me", verifyJWT, me);

module.exports = router;
