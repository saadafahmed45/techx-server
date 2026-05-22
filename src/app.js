// ==========================================
// app.js
// ==========================================

const express = require("express");

const cors = require("cors");

const productRoutes =
  require("./routes/productRoutes");

const collectionRoutes =
  require("./routes/collectionRoutes");

const heroSliderRoutes =
  require("./routes/heroSliderRoutes");

const orderRoutes =
  require("./routes/orderRoutes");

const app = express();

/* =========================================
   CORS
========================================= */

const allowedOrigins = [
  "http://localhost:3000",
  "https://techx-shop.vercel.app",
];

app.use(
  cors({
    origin: function (
      origin,
      callback
    ) {
      if (!origin)
        return callback(
          null,
          true
        );

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "CORS blocked: " +
            origin
        )
      );
    },

    credentials: true,
  })
);

/* =========================================
   BODY PARSER
========================================= */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =========================================
   STATIC FILES
========================================= */

app.use(
  "/uploads",
  express.static(
    "uploads"
  )
);

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

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    if (err) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            err.message ||
            "Server Error",
        });
    }

    next();
  }
);

module.exports = app;