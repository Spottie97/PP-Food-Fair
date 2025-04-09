const jwt = require("jsonwebtoken");
const asyncHandler = require("./asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Else check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to the request object
    req.user = await User.findById(decoded.id).select("-password"); // Exclude password

    if (!req.user) {
      // Handle case where user associated with token no longer exists
      return next(new ErrorResponse("User not found", 401));
    }

    next();
  } catch (err) {
    console.error("Token verification error:", err);
    // Handle specific JWT errors (e.g., expired token)
    if (err.name === "JsonWebTokenError") {
      return next(new ErrorResponse("Not authorized, token failed", 401));
    } else if (err.name === "TokenExpiredError") {
      return next(new ErrorResponse("Not authorized, token expired", 401));
    }
    // Generic error
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${
            req.user ? req.user.role : "none"
          } is not authorized to access this route`,
          403 // Forbidden
        )
      );
    }
    next();
  };
};
