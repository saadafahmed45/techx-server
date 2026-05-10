const express = require("express");

const cors = require("cors");

const productRoutes = require("./routes/productRoutes");

const collectionRoutes = require("./routes/collectionRoutes");

const app = express();


// MIDDLEWARE
app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
  extended: true,
}));


// ROUTES
app.use("/products", productRoutes);

app.use(
  "/collections",
  collectionRoutes
);


// ROOT
app.get("/", (req, res) => {
  res.send({
    success: true,
    message: "API Running",
  });
});

module.exports = app;