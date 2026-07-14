const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.58zpnyp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});

let db;

const connectDB = async () => {
  try {
    if (db) return db;

    await client.connect();

    console.log("✅ MongoDB Connected");

    db = client.db("techx_Shop_Database");

    // Optimized compound indexes for all query patterns
    const indexes = [
      // Products: slug lookup, sorting, filter queries
      { collection: "products", spec: { slug: 1 }, options: { unique: true } },
      { collection: "products", spec: { createdAt: -1 } },
      { collection: "products", spec: { status: 1, createdAt: -1 } },
      { collection: "products", spec: { featured: 1, status: 1, createdAt: -1 } },
      { collection: "products", spec: { vendor: 1 } },
      { collection: "products", spec: { productType: 1 } },
      { collection: "products", spec: { price: 1 } },

      // Collections: slug lookup, sorting
      { collection: "collections", spec: { slug: 1 }, options: { unique: true } },
      { collection: "collections", spec: { createdAt: -1 } },

      // Orders: sorting and phone-based tracking
      { collection: "orders", spec: { createdAt: -1 } },
      { collection: "orders", spec: { phone: 1 } },

      // Hero sliders: filtering by status
      { collection: "heroSliders", spec: { status: 1, createdAt: -1 } },
      { collection: "heroSliders", spec: { createdAt: -1 } },

      // Users: search, filter, pagination
      { collection: "users", spec: { email: 1 }, options: { unique: true } },
      { collection: "users", spec: { createdAt: -1 } },
      { collection: "users", spec: { role: 1, status: 1, createdAt: -1 } },
    ];

    for (const idx of indexes) {
      try {
        await db.collection(idx.collection).createIndex(idx.spec, {
          ...(idx.options || {}),
          background: true,
        });
      } catch (indexError) {
        console.warn(`⚠️ Could not create index on '${idx.collection}' for ${JSON.stringify(idx.spec)}:`, indexError.message);
      }
    }
    console.log("⚡ Database indexes ensured");

    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

const getDB = () => db;

module.exports = {
  connectDB,
  getDB,
};