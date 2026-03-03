const Product = require("../models/Product");

const normalizeLocation = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(/^(?:box\s*)?([a-z0-9-]+)$/i);
  if (!match) return "";
  return `Box ${match[1].toUpperCase()}`;
};

// CREATE
exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock, description, image, category, location } = req.body;
    const normalizedLocation = normalizeLocation(location);

    if (!name || !price || !normalizedLocation) {
      return res.status(400).json({
        message: "Name, price and location are required. Location format must be like 'Box 5'.",
      });
    }

    const product = new Product({
      name,
      price,
      stock: stock || 0,
      description,
      location: normalizedLocation,
      image,
      category,
      shop: req.user.id,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// READ ALL with filters
exports.getProducts = async (req, res) => {
  try {
    const { category, shop, search, minPrice, maxPrice } = req.query;
    let filter = { isActive: true };

    if (category) filter.category = category;
    if (shop) filter.shop = shop;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    const products = await Product.find(filter)
      .populate("shop", "name email")
      .populate("reviews.user", "name");
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ONE
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("shop", "name email")
      .populate("reviews.user", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user is the owner or admin
    if (product.shop.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatePayload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updatePayload, "location")) {
      const normalizedLocation = normalizeLocation(updatePayload.location);
      if (!normalizedLocation) {
        return res.status(400).json({
          message: "Invalid location format. Use format like 'Box 5'.",
        });
      }
      updatePayload.location = normalizedLocation;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true },
    ).populate("shop", "name email");

    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user is the owner or admin
    if (product.shop.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD REVIEW
exports.addReview = async (req, res) => {
  try {
    const { comment, rating } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.reviews.push({
      user: req.user.id,
      comment,
      rating,
    });

    // Calculate average rating
    const avgRating =
      product.reviews.reduce((sum, review) => sum + review.rating, 0) /
      product.reviews.length;
    product.rating = avgRating;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET PRODUCTS BY SHOP
exports.getProductsByShop = async (req, res) => {
  try {
    const products = await Product.find({
      shop: req.params.shopId,
      isActive: true,
    })
      .populate("shop", "name email")
      .populate("reviews.user", "name");
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
