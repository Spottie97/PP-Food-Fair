const { RateLimiterMemory } = require("rate-limiter-flexible");
const ErrorResponse = require("../utils/errorResponse");
const { logger } = require("../utils/logger");

// Basic in-memory rate limiter
// Options:
// points: Number of points
// duration: Window duration in seconds
const limiterOptions = {
  points: 3, // 3 requests
  duration: 60 * 60, // per 1 hour (3600 seconds)
  blockDuration: 60 * 60, // Block for 1 hour if consumed points > options.points
};

const rateLimiter = new RateLimiterMemory(limiterOptions);

const rateLimiterMiddleware = (req, res, next) => {
  // Use IP address as the key
  // Note: req.ip might need Express 'trust proxy' setting if behind a proxy/load balancer
  const ip = req.ip;

  rateLimiter
    .consume(ip)
    .then(() => {
      // Allowed
      next();
    })
    .catch((rejRes) => {
      // Not allowed (rate limited)
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set("Retry-After", String(secs));
      logger.warn(`Rate limit exceeded for IP: ${ip} on ${req.originalUrl}`);
      return next(
        new ErrorResponse(
          `Too many requests. Please try again in ${secs} second(s).`,
          429
        )
      );
    });
};

module.exports = rateLimiterMiddleware;
