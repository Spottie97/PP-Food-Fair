class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Enhance stack trace (optional but helpful)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;
