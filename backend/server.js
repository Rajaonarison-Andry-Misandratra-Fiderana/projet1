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

// 🔥 Servir Angular
const angularPath = path.join(
  __dirname,
  "../frontend/shopping-mall/dist/shopping-mall/browser",
);

app.use(express.static(angularPath));

// 🔥 Fallback SPA (IMPORTANT : toujours en dernier)
app.get("*", (req, res) => {
  res.sendFile(path.join(angularPath, "index.html"));
});

// Démarrage serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur fonctionne sur le port ${PORT}`);
});
