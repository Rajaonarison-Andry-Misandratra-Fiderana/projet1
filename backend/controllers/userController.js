const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const normalizeBox = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{1,6})$/);
  if (!match) return "";
  return `Box ${match[1]}`;
};

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const requestedRole = "acheteur";

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: requestedRole,
      boutiqueStatus: "approved",
      assignedBox: "",
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        boutiqueStatus: user.boutiqueStatus || "approved",
        assignedBox: user.assignedBox,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE SELLER (Admin only)
exports.createSellerByAdmin = async (req, res) => {
  try {
    const { name, email, password, boxNumber } = req.body;
    const normalizedBox = normalizeBox(boxNumber);

    if (!name || !email || !password || !normalizedBox) {
      return res.status(400).json({
        message:
          "name, email, password and boxNumber are required. boxNumber must be numeric (ex: 12).",
      });
    }

    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const seller = new User({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role: "boutique",
      boutiqueStatus: "approved",
      assignedBox: normalizedBox,
    });

    await seller.save();

    res.status(201).json({
      user: {
        id: seller._id,
        name: seller.name,
        email: seller.email,
        role: seller.role,
        boutiqueStatus: seller.boutiqueStatus || "approved",
        assignedBox: seller.assignedBox,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "This box is already assigned to another boutique." });
    }
    res.status(500).json({ message: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        boutiqueStatus: user.boutiqueStatus || "approved",
        assignedBox: user.assignedBox,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ALL USERS (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE USER (Admin)
exports.updateUser = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (Object.prototype.hasOwnProperty.call(payload, "assignedBox")) {
      const normalizedBox = normalizeBox(payload.assignedBox);
      if (payload.assignedBox && !normalizedBox) {
        return res.status(400).json({
          message: "Invalid box format. Enter only numeric box number (ex: 12).",
        });
      }
      payload.assignedBox = normalizedBox;
    }

    if (payload.role && payload.role !== "boutique") {
      payload.boutiqueStatus = "approved";
      payload.assignedBox = "";
    }

    if (payload.role === "boutique" && !payload.boutiqueStatus) {
      payload.boutiqueStatus = "pending";
    }

    if (payload.boutiqueStatus === "approved" && !payload.assignedBox) {
      return res.status(400).json({
        message: "Assigned box is required when approving a boutique.",
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).select("-password");
    res.json(user);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "This box is already assigned to another boutique." });
    }
    res.status(500).json({ message: err.message });
  }
};

// DELETE USER (Admin)
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
