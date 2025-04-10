require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const { errorHandler } = require("./middleware/errorHandler");
const { logger } = require("./utils/logger");
const routes = require("./routes");
const swaggerSpec = require("./config/swagger");
const connectDB = require("./config/db");
const User = require("./models/User"); // Import User model

// Function to create default admin user
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const defaultAdminEmail = "admin@example.com";
      const defaultAdminPassword = "changeme"; // **IMPORTANT: CHANGE THIS PASSWORD AFTER FIRST LOGIN**

      const existingDefault = await User.findOne({ email: defaultAdminEmail });
      if (!existingDefault) {
        await User.create({
          username: "admin",
          email: defaultAdminEmail,
          password: defaultAdminPassword,
          role: "admin",
        });
        logger.info("Default admin user created. Email: admin@example.com");
        logger.warn(
          "IMPORTANT: Please log in as admin@example.com and change the default password ('changeme') immediately!"
        );
      } else {
        // If user with that email exists but isn't admin, log warning
        if (existingDefault.role !== "admin") {
          logger.warn(
            `User with email ${defaultAdminEmail} exists but is not admin. Default admin creation skipped.`
          );
        }
      }
    } else {
      logger.info("Admin user already exists. Default admin creation skipped.");
    }
  } catch (error) {
    logger.error("Error checking/creating default admin user:", error);
  }
};

// Connect to Database and then ensure default admin exists
const initializeApp = async () => {
  await connectDB();
  await createDefaultAdmin(); // Ensure admin exists after DB connection
};

initializeApp(); // Initialize DB and check/create admin

const app = express();

// Define allowed origins
const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:3000"];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies/credentials
};

// Middleware
app.use(cors(corsOptions)); // Use configured CORS options
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("combined", { stream: logger.stream }));

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use(process.env.API_PREFIX || "/api/v1", routes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
