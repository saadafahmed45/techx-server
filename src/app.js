const express = require("express");

const cors = require("cors");

const productRoutes = require("./routes/productRoutes");

const collectionRoutes = require("./routes/collectionRoutes");
const heroSliderRoutes = require("./routes/heroSliderRoutes");
const app = express();

// MIDDLEWARE
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

// ROUTES
app.use("/products", productRoutes);

app.use(
  "/collections",
  collectionRoutes
);

app.use(
  "/hero-sliders",
  heroSliderRoutes
);

// ROOT
app.get("/", (req, res) => {
  res.send({
    success: true,
    message: "API Running",
  });
});

module.exports = app;