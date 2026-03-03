const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addReview,
  getProductsByShop,
  getAdminVisibleProducts,
} = require("../controllers/productController");
const { auth, authorize } = require("../middleware/auth");

// Public routes
router.get("/", getProducts);
router.get("/shop/:shopId", getProductsByShop);
router.get("/admin/visible", auth, authorize(["admin"]), getAdminVisibleProducts);
router.get("/:id", getProductById);

// Protected routes (boutique and admin can create)
router.post("/", auth, authorize(["boutique", "admin"]), createProduct);

// Protected routes (only owner or admin can update/delete)
router.put("/:id", auth, updateProduct);
router.delete("/:id", auth, deleteProduct);

// Reviews
router.post("/:id/reviews", auth, addReview);

module.exports = router;
