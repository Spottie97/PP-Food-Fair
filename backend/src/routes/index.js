const express = require("express");
const router = express.Router();

// Placeholder for future routes
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend is running" });
});

// Example: Mount auth routes (will be created later)
// const authRoutes = require('./authRoutes');
const authRoutes = require("./authRoutes"); // Import auth routes
const recipeRoutes = require("./recipeRoutes"); // Import recipe routes
const ingredientRoutes = require("./ingredientRoutes"); // Import ingredient routes
const laborRoutes = require("./laborRoutes"); // Import labor routes
const userRoutes = require("./userRoutes"); // Import user routes

router.use("/auth", authRoutes); // Mount auth routes under /auth
router.use("/recipes", recipeRoutes); // Mount recipe routes under /recipes
router.use("/ingredients", ingredientRoutes); // Mount ingredient routes under /ingredients
router.use("/labor", laborRoutes); // Mount labor routes under /labor
router.use("/users", userRoutes); // Mount user routes under /users

module.exports = router;
