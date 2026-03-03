const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["admin", "boutique", "acheteur"],
      default: "acheteur",
    },
    boutiqueStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    assignedBox: {
      type: String,
      trim: true,
      default: "",
    },
    adminCanViewCommerce: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userSchema.index(
  { assignedBox: 1 },
  { unique: true, partialFilterExpression: { assignedBox: { $type: "string", $ne: "" } } },
);

module.exports = mongoose.model("User", userSchema);
