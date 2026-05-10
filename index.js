// // server.js

// require("dotenv").config();

// const express = require("express");
// const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

// const app = express();
// const port = 5000;

// // ======================================
// // Middleware
// // ======================================
// app.use(express.json());


// // ======================================
// // MongoDB URI
// // ======================================
// const uri = process.env.MONGO_URI;


// // ======================================
// // MongoDB Client
// // ======================================
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// let usersCollection;


// // ======================================
// // MongoDB Connect
// // ======================================
// async function connectDB() {
//   try {

//     await client.connect();

//     console.log("MongoDB Connected Successfully");

//     const database = client.db("crudDB");

//     usersCollection = database.collection("users");

//   } catch (error) {
//     console.log("MongoDB Connection Error:", error);
//   }
// }

// connectDB();


// // ======================================
// // Root Route
// // ======================================
// app.get("/", (req, res) => {
//   res.send({
//     success: true,
//     message: "CRUD API Running Successfully",
//   });
// });


// // ======================================
// // CREATE USER
// // POST http://localhost:5000/users
// // ======================================
// app.post("/users", async (req, res) => {
//   try {

//     // Check DB
//     if (!usersCollection) {
//       return res.status(500).send({
//         success: false,
//         message: "Database not connected",
//       });
//     }

//     // Get Data
//     const bodyData = req.body;

//     // Validation
//     if (!bodyData || Object.keys(bodyData).length === 0) {
//       return res.status(400).send({
//         success: false,
//         message: "Request body is empty",
//       });
//     }

//     const { name, email, age } = bodyData;

//     if (!name || !email) {
//       return res.status(400).send({
//         success: false,
//         message: "Name and Email are required",
//       });
//     }

//     // Create User Object
//     const user = {
//       name,
//       email,
//       age: age || null,
//       createdAt: new Date(),
//     };

//     // Insert Data
//     const result = await usersCollection.insertOne(user);

//     res.status(201).send({
//       success: true,
//       message: "User Created Successfully",
//       insertedId: result.insertedId,
//       data: user,
//     });

//   } catch (error) {

//     res.status(500).send({
//       success: false,
//       error: error.message,
//     });

//   }
// });


// // ======================================
// // GET ALL USERS
// // GET http://localhost:5000/users
// // ======================================
// app.get("/users", async (req, res) => {
//   try {

//     if (!usersCollection) {
//       return res.status(500).send({
//         success: false,
//         message: "Database not connected",
//       });
//     }

//     const users = await usersCollection.find().toArray();

//     res.send({
//       success: true,
//       count: users.length,
//       data: users,
//     });

//   } catch (error) {

//     res.status(500).send({
//       success: false,
//       error: error.message,
//     });

//   }
// });


// // ======================================
// // GET SINGLE USER
// // GET http://localhost:5000/users/:id
// // ======================================
// app.get("/users/:id", async (req, res) => {
//   try {

//     if (!usersCollection) {
//       return res.status(500).send({
//         success: false,
//         message: "Database not connected",
//       });
//     }

//     const id = req.params.id;

//     // Check Valid ID
//     if (!ObjectId.isValid(id)) {
//       return res.status(400).send({
//         success: false,
//         message: "Invalid User ID",
//       });
//     }

//     const user = await usersCollection.findOne({
//       _id: new ObjectId(id),
//     });

//     if (!user) {
//       return res.status(404).send({
//         success: false,
//         message: "User Not Found",
//       });
//     }

//     res.send({
//       success: true,
//       data: user,
//     });

//   } catch (error) {

//     res.status(500).send({
//       success: false,
//       error: error.message,
//     });

//   }
// });


// // ======================================
// // UPDATE USER
// // PUT http://localhost:5000/users/:id
// // ======================================
// app.put("/users/:id", async (req, res) => {
//   try {

//     if (!usersCollection) {
//       return res.status(500).send({
//         success: false,
//         message: "Database not connected",
//       });
//     }

//     const id = req.params.id;

//     // Check Valid ID
//     if (!ObjectId.isValid(id)) {
//       return res.status(400).send({
//         success: false,
//         message: "Invalid User ID",
//       });
//     }

//     const updatedData = req.body;

//     const result = await usersCollection.updateOne(
//       { _id: new ObjectId(id) },
//       {
//         $set: updatedData,
//       }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).send({
//         success: false,
//         message: "User Not Found",
//       });
//     }

//     res.send({
//       success: true,
//       message: "User Updated Successfully",
//       result,
//     });

//   } catch (error) {

//     res.status(500).send({
//       success: false,
//       error: error.message,
//     });

//   }
// });


// // ======================================
// // DELETE USER
// // DELETE http://localhost:5000/users/:id
// // ======================================
// app.delete("/users/:id", async (req, res) => {
//   try {

//     if (!usersCollection) {
//       return res.status(500).send({
//         success: false,
//         message: "Database not connected",
//       });
//     }

//     const id = req.params.id;

//     // Check Valid ID
//     if (!ObjectId.isValid(id)) {
//       return res.status(400).send({
//         success: false,
//         message: "Invalid User ID",
//       });
//     }

//     const result = await usersCollection.deleteOne({
//       _id: new ObjectId(id),
//     });

//     if (result.deletedCount === 0) {
//       return res.status(404).send({
//         success: false,
//         message: "User Not Found",
//       });
//     }

//     res.send({
//       success: true,
//       message: "User Deleted Successfully",
//       result,
//     });

//   } catch (error) {

//     res.status(500).send({
//       success: false,
//       error: error.message,
//     });

//   }
// });


// // ======================================
// // Start Server
// // ======================================
// app.listen(port, () => {
//   console.log(`Server Running On Port ${port}`);
// });