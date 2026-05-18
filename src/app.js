const express = require("express");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const heroSliderRoutes = require("./routes/heroSliderRoutes");

const app = express();

/* =========================================
   CORS (PRODUCTION SAFE)
========================================= */

const allowedOrigins = [
  "http://localhost:3000",
  "https://techx-shop.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow tools like Postman / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  })
);

/* =========================================
   BODY PARSER
========================================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================
   STATIC FILES (IMAGES)
========================================= */

app.use("/uploads", express.static("uploads"));

/* =========================================
   ROUTES
========================================= */

app.use("/products", productRoutes);
app.use("/collections", collectionRoutes);
app.use("/hero-sliders", heroSliderRoutes);

/* =========================================
   ROOT CHECK
========================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running Successfully 🚀",
  });
});

/* =========================================
   ERROR HANDLING (IMPORTANT FOR CORS)
========================================= */

app.use((err, req, res, next) => {
  if (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server Error",
    });
  }
  next();
});

module.exports = app;