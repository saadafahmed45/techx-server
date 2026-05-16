require("dotenv").config();

const app = require("./app");

const {
  connectDB,
} = require("./config/db");

let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

module.exports = async (req, res) => {
  await connect();

  return app(req, res);
};