const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  getProfile,
  getAllUsers,
  updateUser,
  deleteUser,
  createSellerByAdmin,
  changePassword,
} = require("../controllers/userController");
const { auth, authorize } = require("../middleware/auth");

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes
router.get("/profile", auth, getProfile);
router.put("/change-password", auth, changePassword);

// Admin only routes
router.get("/", auth, authorize(["admin"]), getAllUsers);
router.post("/admin-create-seller", auth, authorize(["admin"]), createSellerByAdmin);
router.put("/:id", auth, authorize(["admin"]), updateUser);
router.delete("/:id", auth, authorize(["admin"]), deleteUser);

module.exports = router;
