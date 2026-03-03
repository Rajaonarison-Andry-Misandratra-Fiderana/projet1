const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientRequestId: {
      type: String,
      trim: true,
      index: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        shop: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    deliveryContact: {
      fullName: String,
      email: String,
      phone: String,
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "debit_card", "paypal", "bank_transfer"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentValidatedAt: Date,
    paymentValidatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    transactionSnapshot: {
      buyer: {
        id: String,
        name: String,
        email: String,
      },
      sellers: [
        {
          id: String,
          name: String,
          email: String,
        },
      ],
      shippingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      deliveryContact: {
        fullName: String,
        email: String,
        phone: String,
      },
      items: [
        {
          productId: String,
          productName: String,
          unitPrice: Number,
          quantity: Number,
          sellerId: String,
          sellerName: String,
        },
      ],
      totalAmount: Number,
      paymentMethod: String,
      capturedAt: Date,
    },
    notes: String,
  },
  { timestamps: true },
);

orderSchema.index(
  { buyer: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } },
);

module.exports = mongoose.model("Order", orderSchema);
