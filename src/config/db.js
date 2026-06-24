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

    // Ensure database indexes for optimized query performance
    const indexes = [
      { collection: "products", spec: { slug: 1 }, options: { unique: true } },
      { collection: "products", spec: { createdAt: -1 } },
      { collection: "collections", spec: { slug: 1 }, options: { unique: true } },
      { collection: "collections", spec: { createdAt: -1 } },
      { collection: "orders", spec: { createdAt: -1 } },
      { collection: "heroSliders", spec: { createdAt: -1 } },
      { collection: "users", spec: { email: 1 }, options: { unique: true } },
      { collection: "users", spec: { createdAt: -1 } },
    ];

    for (const idx of indexes) {
      try {
        await db.collection(idx.collection).createIndex(idx.spec, idx.options || {});
      } catch (indexError) {
        console.warn(`⚠️ Could not create index on '${idx.collection}' for ${JSON.stringify(idx.spec)}:`, indexError.message);
      }
    }
    console.log("⚡ Database Index Setup Attempt Completed");

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