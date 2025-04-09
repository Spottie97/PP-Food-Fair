const { logger } = require("../utils/logger");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  // Determine status based on statusCode, overriding any existing err.status
  const status = `${err.statusCode}`.startsWith("4") ? "fail" : "error";

  if (process.env.NODE_ENV === "development") {
    res.status(err.statusCode).json({
      status: status, // Use the calculated status
      error: err,
      message: err.message || "An error occurred",
      stack: err.stack,
    });
  } else {
    // Production mode
    // Use the calculated status for operational errors as well
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: status, // Use the calculated status
        message: err.message,
      });
    } else {
      // Programming or unknown errors
      logger.error("ERROR 💥", err);
      res.status(500).json({
        status: "error", // Always 'error' for 500 in production
        message: "Something went wrong!",
      });
    }
  }
};

module.exports = {
  AppError,
  errorHandler,
};
