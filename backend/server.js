const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const connectDB = require("./config/db");

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

app.use(express.static(angularPath, { index: false }));

// 404 for unknown API endpoints
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// SPA fallback only for application routes (not missing assets)
app.use((req, res) => {
  if (path.extname(req.path)) {
    res.status(404).type("text/plain").send("Asset not found");
    return;
  }
  res.sendFile(path.join(angularPath, "index.html"));
});

// ===============================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Serveur lancé sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Impossible de démarrer le serveur:", error.message);
    process.exit(1);
  }
};

startServer();
