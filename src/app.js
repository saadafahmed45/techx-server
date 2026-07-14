// ==========================================
// app.js
// ==========================================

const express = require("express");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const heroSliderRoutes = require("./routes/heroSliderRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Compression
app.use(compression({ level: 6, threshold: 1024 }));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.removeHeader("X-Powered-By");
  next();
});

/* =========================================
   CORS
========================================= */

const allowedOrigins = [
  "http://localhost:3000",
  "https://techx-shop.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
    maxAge: 86400,
  })
);

/* =========================================
   BODY PARSER
========================================= */

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================================
   STATIC FILES
========================================= */

app.use("/uploads", express.static("uploads", { maxAge: "7d" }));

/* =========================================
   ROUTES
========================================= */

app.use(
  "/products",
  productRoutes
);

app.use(
  "/collections",
  collectionRoutes
);

app.use(
  "/hero-sliders",
  heroSliderRoutes
);

// ORDER ROUTE
app.use(
  "/orders",
  orderRoutes
);

// USER & AUTH ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/* =========================================
   ROOT
========================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,

    message:
      "API Running Successfully 🚀",
  });
});

/* =========================================
   ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {
  console.error("❌ API Error:", err);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

module.exports = app;