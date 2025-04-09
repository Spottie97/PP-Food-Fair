const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
require("dotenv").config(); // Ensure environment variables are loaded

let mongoServer;

// Use the MongoDB URI from the Jest preset if available,
// otherwise, create a new in-memory server.
// The preset sets process.env.MONGO_URL

beforeAll(async () => {
  if (!process.env.MONGO_URL) {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    console.log("Using separate MongoMemoryServer:", process.env.MONGODB_URI);
  } else {
    process.env.MONGODB_URI = process.env.MONGO_URL; // Use preset's URL
    console.log("Using Jest MongoDB preset URI:", process.env.MONGODB_URI);
  }

  // Set other required env vars for tests if not already set
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
  process.env.JWT_COOKIE_EXPIRE = process.env.JWT_COOKIE_EXPIRE || "1";

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Test MongoDB Connected...");
  } catch (err) {
    console.error("Test MongoDB connection error:", err);
    process.exit(1);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  console.log("Test MongoDB Disconnected.");
  if (mongoServer) {
    await mongoServer.stop();
    console.log("Separate MongoMemoryServer stopped.");
  }
});

// Clear all test data after every test.
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
