const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const connectDB = require("./config/db");
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes API
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// ===============================
// 🔥 SERVIR ANGULAR (PRODUCTION)
// ===============================

const angularPath = path.join(
  __dirname,
  "../frontend/shopping-mall/dist/shopping-mall/browser",
);

app.use(express.static(angularPath));

// Fallback SPA (compatible Express 5)
app.use((req, res) => {
  res.sendFile(path.join(angularPath, "index.html"));
});

// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
