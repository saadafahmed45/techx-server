const {
  MongoClient,
  ServerApiVersion,
} = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.58zpnyp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

const connectDB = async () => {
  try {
    if (db) return db;

    await client.connect();

    console.log("✅ MongoDB Connected");

    db = client.db(
      "techx_Shop_Database"
    );

    return db;
  } catch (error) {
    console.log(error);
  }
};

const getDB = () => db;

module.exports = {
  connectDB,
  getDB,
};