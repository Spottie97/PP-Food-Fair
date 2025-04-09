const User = require("../models/User");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../middleware/asyncHandler"); // Utility to handle async errors
const ErrorResponse = require("../utils/errorResponse"); // Custom error class

// Generate JWT token
const getSignedJwtToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    role, // Note: In a real app, you might restrict role assignment
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = getSignedJwtToken(user._id);

  const options = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRE || "30", 10) *
          24 *
          60 *
          60 *
          1000 // Default to 30 days if not set
    ),
    httpOnly: true, // Cookie cannot be accessed by client-side script
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true; // Only send cookie over HTTPS
  }

  // We are sending the token in a cookie for security (httpOnly)
  // and also in the response body for flexibility
  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      // Optionally send user data (excluding password)
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  // req.user is set by the protect middleware
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.user.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});
