const express = require("express");
const {
  register,
  login,
  getMe,
  logout,
  verifyEmail,
} = require("../controllers/authController");
const { check, validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

const router = express.Router();

// We need a middleware to protect routes like /me and /logout
const { protect } = require("../middleware/authMiddleware");

// Middleware to handle validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors to include parameter names for better matching in tests
    const errorMessages = errors
      .array()
      // Use err.path for parameter name (err.param is deprecated)
      .map((err) => `${err.path}: ${err.msg}`)
      .join("; ");
    return next(new ErrorResponse(`Validation Error: ${errorMessages}`, 400));
    // Alternatively, send the full error array:
    // return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Validation rules for registration
const registerValidationRules = [
  check("username", "Username is required").not().isEmpty(),
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password must be 6 or more characters").isLength({
    min: 6,
  }),
];

// Validation rules for login
const loginValidationRules = [
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
];

router.post("/register", registerValidationRules, validateRequest, register);
router.post("/login", loginValidationRules, validateRequest, login);
router.get("/me", protect, getMe); // Protect this route
router.get("/logout", protect, logout); // Protect this route

// Add route for email verification
router.get("/verifyemail", verifyEmail);

module.exports = router;
