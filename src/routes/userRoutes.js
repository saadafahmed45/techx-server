const express = require("express");
const {
  getUsers,
  getSingleUser,
  createUser,
  updateUser,
  changeUserStatus,
  deleteUser,
} = require("../controllers/userController");
const { verifyJWT, verifyAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all user routes (require JWT and Admin role)
router.use(verifyJWT, verifyAdmin);

router.get("/", getUsers);
router.get("/:id", getSingleUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/status", changeUserStatus);
router.delete("/:id", deleteUser);

module.exports = router;
