const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return "";
};

const buildTransactionSnapshot = (order) => {
  const buyer =
    typeof order.buyer === "object" && order.buyer
      ? {
          id: toId(order.buyer),
          name: order.buyer.name || "",
          email: order.buyer.email || "",
        }
      : { id: toId(order.buyer), name: "", email: "" };

  const sellersMap = new Map();
  const items = (order.items || []).map((item) => {
    const shop = item.shop;
    const sellerId = toId(shop);
    const sellerName = typeof shop === "object" && shop ? shop.name || "" : "";
    const sellerEmail = typeof shop === "object" && shop ? shop.email || "" : "";
    if (sellerId && !sellersMap.has(sellerId)) {
      sellersMap.set(sellerId, { id: sellerId, name: sellerName, email: sellerEmail });
    }

    const product = item.product;
    return {
      productId: toId(product),
      productName: typeof product === "object" && product ? product.name || "" : "",
      unitPrice: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      sellerId,
      sellerName,
    };
  });

  return {
    buyer,
    sellers: Array.from(sellersMap.values()),
    deliveryContact: {
      fullName: order.deliveryContact?.fullName || "",
      email: order.deliveryContact?.email || "",
      phone: order.deliveryContact?.phone || "",
    },
    shippingAddress: {
      street: order.shippingAddress?.street || "",
      city: order.shippingAddress?.city || "",
      state: order.shippingAddress?.state || "",
      zipCode: order.shippingAddress?.zipCode || "",
      country: order.shippingAddress?.country || "",
    },
    items,
    totalAmount: Number(order.totalAmount || 0),
    paymentMethod: order.paymentMethod || "",
    capturedAt: new Date(),
  };
};

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, deliveryContact, paymentMethod, clientRequestId } = req.body;

    if (clientRequestId) {
      const existingOrder = await Order.findOne({ buyer: req.user.id, clientRequestId })
        .populate("buyer", "name email")
        .populate("items.product", "name price image")
        .populate("items.shop", "name email");
      if (existingOrder) {
        return res.json(existingOrder);
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order must contain items" });
    }

    // Calculate total and validate stock
    let totalAmount = 0;
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      totalAmount += product.price * item.quantity;
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const order = new Order({
      orderNumber,
      buyer: req.user.id,
      clientRequestId: clientRequestId ? String(clientRequestId).trim() : undefined,
      items,
      totalAmount,
      shippingAddress,
      deliveryContact: {
        fullName: deliveryContact?.fullName || "",
        email: deliveryContact?.email || "",
        phone: deliveryContact?.phone || "",
      },
      paymentMethod,
    });

    await order.save();
    await order.populate([
      { path: "buyer", select: "name email" },
      { path: "items.product", select: "name price image" },
      { path: "items.shop", select: "name email" },
    ]);

    res.status(201).json(order);
  } catch (err) {
    if (err?.code === 11000 && req.body?.clientRequestId) {
      const existingOrder = await Order.findOne({
        buyer: req.user.id,
        clientRequestId: req.body.clientRequestId,
      })
        .populate("buyer", "name email")
        .populate("items.product", "name price image")
        .populate("items.shop", "name email");
      if (existingOrder) return res.json(existingOrder);
    }
    res.status(500).json({ message: err.message });
  }
};

// GET MY ORDERS (for buyers)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate("items.product", "name price image")
      .populate("items.shop", "name email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ORDERS FOR SHOP (for boutiques)
exports.getShopOrders = async (req, res) => {
  try {
    const orders = await Order.find({ "items.shop": req.user.id })
      .populate("buyer", "name email")
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ALL ORDERS (admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("buyer", "name email")
      .populate("items.product", "name price image")
      .populate("items.shop", "name email")
      .sort({ createdAt: -1 });

    const sellerIds = Array.from(
      new Set(
        orders
          .flatMap((order) => (order.items || []).map((item) => toId(item.shop)))
          .filter(Boolean),
      ),
    );
    const sellers = await User.find({
      _id: { $in: sellerIds },
      role: "boutique",
      adminCanViewCommerce: true,
    }).select("_id");
    const allowedSellerIds = new Set(sellers.map((seller) => String(seller._id)));

    const visibleOrders = orders
      .map((order) => {
        const source = typeof order.toObject === "function" ? order.toObject() : order;
        const visibleItems = (source.items || []).filter((item) =>
          allowedSellerIds.has(toId(item.shop)),
        );
        if (visibleItems.length === 0) return null;
        return {
          ...source,
          items: visibleItems,
          totalAmount: visibleItems.reduce(
            (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
            0,
          ),
        };
      })
      .filter(Boolean);

    res.json(visibleOrders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer", "name email")
      .populate("items.product", "name price image")
      .populate("items.shop", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization (buyer, shop owner, or admin)
    const isBuyer = order.buyer._id.toString() === req.user.id;
    const isShopOwner = order.items.some(item => item.shop._id.toString() === req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isShopOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE ORDER STATUS
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    const isShopOwner = order.items.some(item => item.shop.toString() === req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isShopOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    order.status = status;
    await order.save();

    await order.populate([
      { path: "buyer", select: "name email" },
      { path: "items.product", select: "name price image" },
      { path: "items.shop", select: "name email" },
    ]);

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE PAYMENT STATUS
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!["pending", "completed", "failed"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await Order.findById(req.params.id)
      .populate("buyer", "name email")
      .populate("items.product", "name price image")
      .populate("items.shop", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization (only admin or buyer)
    const isBuyer = toId(order.buyer) === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (paymentStatus === "completed" && order.paymentStatus === "completed") {
      return res.json(order);
    }

    order.paymentStatus = paymentStatus;
    if (paymentStatus === "completed") {
      order.paymentValidatedAt = new Date();
      order.paymentValidatedBy = req.user.id;
      order.transactionSnapshot = buildTransactionSnapshot(order);
    }
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE ORDER (admin only)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
