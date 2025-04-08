const express = require("express");
const router = express.Router();

// Placeholder for future routes
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend is running" });
});

// Example: Mount auth routes (will be created later)
// const authRoutes = require('./authRoutes');
// router.use('/auth', authRoutes);

// Example: Mount pie routes (will be created later)
// const pieRoutes = require('./pieRoutes');
// router.use('/pies', pieRoutes);

module.exports = router;
