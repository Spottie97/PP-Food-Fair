const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const User = require("../models/User"); // Adjust path as necessary
const authRoutes = require("../routes/authRoutes"); // Adjust path as necessary
const { errorHandler } = require("../middleware/errorHandler"); // Adjust path

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use(cookieParser()); // Use cookie-parser middleware
app.use("/api/v1/auth", authRoutes);
app.use(errorHandler); // Add error handler

// --- Test Suite for Auth Routes ---
describe("Authentication API (/api/v1/auth)", () => {
  // Test user data
  const userData = {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
  };
  let token = null; // To store the token for authenticated requests
  let userId = null; // To store the user ID

  // --- Registration Tests ---
  describe("POST /register", () => {
    it("should register a new user successfully", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(userData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("token");
      expect(res.headers["set-cookie"]).toBeDefined(); // Check if cookie is set

      // Verify user in database
      const user = await User.findOne({ email: userData.email });
      expect(user).not.toBeNull();
      expect(user.username).toBe(userData.username);
      expect(user).toHaveProperty("password"); // Should not be userData.password
    });

    it("should fail if email is already registered", async () => {
      // Register first time (expected success)
      await request(app).post("/api/v1/auth/register").send(userData);

      // Try registering again with the same email
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(userData);

      expect(res.statusCode).toEqual(500); // Mongoose duplicate key error -> 500 by default handler
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "error");
      expect(res.body.message).toMatch(/duplicate key error/); // More specific check
    });

    it("should fail with missing fields", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ username: "test" });

      expect(res.statusCode).toEqual(400); // Validation error
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body.message).toContain("Validation Error:");
      expect(res.body.message).toContain("email: Please include a valid email");
      expect(res.body.message).toContain(
        "password: Password must be 6 or more characters"
      );
    });
  });

  // --- Login Tests ---
  describe("POST /login", () => {
    // Register user before login tests
    beforeEach(async () => {
      await request(app).post("/api/v1/auth/register").send(userData);
    });

    it("should login registered user successfully and return token/cookie", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: userData.email,
        password: userData.password,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("token");
      expect(res.headers["set-cookie"]).toBeDefined();

      token = res.body.token; // Store token for later tests
      const user = await User.findOne({ email: userData.email });
      userId = user._id.toString(); // Store userId
    });

    it("should fail login with incorrect password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: userData.email,
        password: "wrongpassword",
      });

      expect(res.statusCode).toEqual(401);
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should fail login with non-existent email", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "nonexistent@example.com",
        password: userData.password,
      });

      expect(res.statusCode).toEqual(401);
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should fail login with missing password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: userData.email });

      expect(res.statusCode).toEqual(400);
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body.message).toContain("Validation Error:");
      expect(res.body.message).toContain("password: Password is required");
    });
  });

  // --- Get Me Tests ---
  describe("GET /me", () => {
    // Need to be logged in for these tests
    beforeEach(async () => {
      // Register and login to get token
      await request(app).post("/api/v1/auth/register").send(userData);
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: userData.email,
        password: userData.password,
      });
      token = loginRes.body.token;
    });

    it("should get current user details with valid token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.data).toHaveProperty("email", userData.email);
      expect(res.body.data).toHaveProperty("username", userData.username);
      expect(res.body.data).not.toHaveProperty("password");
    });

    it("should fail if no token is provided", async () => {
      const res = await request(app).get("/api/v1/auth/me");

      expect(res.statusCode).toEqual(401);
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body.message).toBe("Not authorized to access this route");
    });

    it("should fail if token is invalid", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalidtoken");

      expect(res.statusCode).toEqual(401);
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body.message).toBe("Not authorized, token failed");
    });
  });

  // --- Logout Tests ---
  describe("GET /logout", () => {
    beforeEach(async () => {
      // Register and login
      await request(app).post("/api/v1/auth/register").send(userData);
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: userData.email,
        password: userData.password,
      });
      token = loginRes.body.token;
    });

    it("should logout user successfully and clear cookie", async () => {
      const res = await request(app)
        .get("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.headers["set-cookie"]).toBeDefined();
      // Check if cookie is set to 'none' and expires in the past/shortly
      const cookie = res.headers["set-cookie"][0];
      expect(cookie).toMatch(/token=none/);
      expect(cookie).toMatch(/Expires=/); // Check that Expires attribute is set
    });

    it("should require authentication to logout", async () => {
      const res = await request(app).get("/api/v1/auth/logout");

      expect(res.statusCode).toEqual(401);
      // Adjust assertion for development error format
      expect(res.body).toHaveProperty("status", "fail");
      expect(res.body.message).toBe("Not authorized to access this route");
    });
  });
});
