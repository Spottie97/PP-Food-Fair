const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pie Pricing Calculator API",
      version: "1.0.0",
      description:
        "API documentation for the Pie Pricing Calculator application",
    },
    servers: [
      {
        url: process.env.API_PREFIX || "http://localhost:5000/api/v1",
      },
    ],
    // Components section for security schemes, schemas etc.
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  // Note: Adjust the path according to your routes structure
  apis: ["./src/routes/*.js"], // Path to the API routes files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
