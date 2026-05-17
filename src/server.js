// ==========================================
// server.js
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const productRoutes = require("./routes/productRoutes");
const collectionRoutes = require("./routes/collectionRoutes");

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://techx-shop.vercel.app",
    ],

    credentials: true,
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==========================================
// STATIC UPLOADS
// ==========================================
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// ==========================================
// ROUTES
// ==========================================
app.use("/products", productRoutes);

app.use(
  "/collections",
  collectionRoutes
);

// ==========================================
// ROOT
// ==========================================
app.get("/", (req, res) => {
  res.send({
    success: true,
    message: "API Running",
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message:
      err.message ||
      "Internal Server Error",
  });
});

module.exports = app;