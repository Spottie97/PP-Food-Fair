const User = require("../models/User");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../middleware/asyncHandler"); // Utility to handle async errors
const ErrorResponse = require("../utils/errorResponse"); // Custom error class
const sendEmail = require("../utils/sendEmail"); // Import email utility
const crypto = require("crypto"); // Import crypto for token verification

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
  const { username, email, password } = req.body;

  // Create user instance (but don't save yet)
  let user = new User({
    username,
    email,
    password, // Password will be hashed by the pre-save hook
    // isVerified defaults to false
  });

  // Generate verification token (the method saves the hashed version and expiry on the user instance)
  const verificationToken = user.getEmailVerificationToken();

  // Now save the user with the hashed token/expiry
  try {
    await user.save();
  } catch (error) {
    // Handle potential duplicate email errors etc.
    // Clear token fields if save fails
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    return next(error);
  }

  // Create verification URL
  const verificationUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/verifyemail?token=${verificationToken}`;
  // For frontend routing (if verification happens via frontend page)
  // const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

  const message = `
    You are receiving this email because you (or someone else) have registered an account at Pie Pricing Software.
    Please click on the following link, or paste it into your browser to complete the process:
    
    ${verificationUrl}
    
    If you did not request this, please ignore this email.
    This link will expire in 10 minutes.
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Pie Pricing Software - Email Verification",
      message,
    });

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      // Do NOT send token or user data until verified
    });
  } catch (err) {
    console.error("Email sending error:", err);
    // If email fails, we should ideally rollback the user creation or mark them as needing verification resend
    // For simplicity now, we'll clear the token and let the user know
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false }); // Save without validation

    return next(
      new ErrorResponse(
        "Email could not be sent, please try registering again later.",
        500
      )
    );
  }

  // Removed: sendTokenResponse(user, 201, res); // Don't log in immediately
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

  // **** ADDED VERIFICATION CHECK ****
  if (!user.isVerified) {
    return next(
      new ErrorResponse("Account not verified. Please check your email.", 403)
    ); // 403 Forbidden
  }
  // **** END ADDED CHECK ****

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

// @desc    Verify email
// @route   GET /api/v1/auth/verifyemail
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  // Get token from query param
  const token = req.query.token;

  if (!token) {
    return next(new ErrorResponse("Verification token missing", 400));
  }

  // Hash the token from the query param to match the one stored in DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user by hashed token and check expiry
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() }, // Check if token is not expired
  });

  if (!user) {
    return next(
      new ErrorResponse("Invalid or expired verification token", 400)
    );
  }

  // Token is valid, verify the user
  user.isVerified = true;
  user.emailVerificationToken = undefined; // Clear token fields
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false }); // Save changes

  // Respond with success or redirect info
  // Option 1: Simple success message
  // res.status(200).json({ success: true, message: "Email verified successfully. You can now log in." });

  // Option 2: Redirect to a frontend page (e.g., login page with success message)
  res.redirect(
    `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?verified=true`
  );

  // Option 3: Send back user and token (auto-login after verification - convenient but less common)
  // sendTokenResponse(user, 200, res);
});

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
