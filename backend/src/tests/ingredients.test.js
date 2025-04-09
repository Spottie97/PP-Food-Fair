const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const User = require("../models/User");
const Ingredient = require("../models/Ingredient");
const authRoutes = require("../routes/authRoutes");
const ingredientRoutes = require("../routes/ingredientRoutes");
const { errorHandler } = require("../middleware/errorHandler");

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use(cookieParser());
// Mount necessary routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/ingredients", ingredientRoutes);
app.use(errorHandler);

// --- Test Suite for Ingredient Routes ---
describe("Ingredient API (/api/v1/ingredients)", () => {
  let adminToken;
  let userToken;
  let adminUserId;
  let regularUserId;
  let ingredientId;

  const adminUser = {
    username: "adminuser",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
  };
  const regularUser = {
    username: "regularuser",
    email: "user@example.com",
    password: "password123",
    role: "user",
  };

  const ingredientData = {
    ingredientName: "Flour",
    unit: "kg",
    costPerUnit: 1.5,
    supplier: "Supplier A",
    category: "Pantry",
  };

  beforeEach(async () => {
    // Register admin
    const adminRegRes = await request(app)
      .post("/api/v1/auth/register")
      .send(adminUser);
    adminUserId = adminRegRes.body.data._id;
    // Login admin
    const adminLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLoginRes.body.token;

    // Register user
    const userRegRes = await request(app)
      .post("/api/v1/auth/register")
      .send(regularUser);
    regularUserId = userRegRes.body.data._id;
    // Login user
    const userLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: regularUser.email, password: regularUser.password });
    userToken = userLoginRes.body.token;

    // Create a baseline ingredient for tests that need one existing
    const ingredientRes = await request(app)
      .post("/api/v1/ingredients")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(ingredientData);
    if (ingredientRes.body.success) {
      ingredientId = ingredientRes.body.data._id;
    } else {
      // Handle error or log if ingredient creation fails during setup
      console.error(
        "Failed to create baseline ingredient in beforeEach:",
        ingredientRes.body
      );
      ingredientId = null; // Ensure it's null if creation failed
    }
  });

  // --- Create Ingredient Tests (POST /) ---
  describe("POST /", () => {
    it("should allow admin to create an ingredient", async () => {
      const newIngredientData = {
        ...ingredientData,
        ingredientName: "Sugar",
      };
      const res = await request(app)
        .post("/api/v1/ingredients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newIngredientData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("_id");
      expect(res.body.data.ingredientName).toBe(
        newIngredientData.ingredientName
      );
      expect(res.body.data.unit).toBe(newIngredientData.unit);
      expect(res.body.data.costPerUnit).toBe(newIngredientData.costPerUnit);
      expect(res.body.data.createdBy.username).toBe(adminUser.username);

      // Verify in DB
      const ingredientInDb = await Ingredient.findById(res.body.data._id);
      expect(ingredientInDb).not.toBeNull();
      expect(ingredientInDb.ingredientName).toBe(
        newIngredientData.ingredientName
      );
      expect(ingredientInDb.createdBy.toString()).toBe(adminUserId.toString());
    });

    it("should prevent regular user from creating an ingredient", async () => {
      const res = await request(app)
        .post("/api/v1/ingredients")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ ...ingredientData, ingredientName: "Sugar" });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain("not authorized");
    });

    it("should prevent unauthenticated user from creating an ingredient", async () => {
      const res = await request(app)
        .post("/api/v1/ingredients")
        .send({ ...ingredientData, ingredientName: "Salt" });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe("fail");
    });

    it("should fail if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/v1/ingredients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ingredientName: "Yeast" });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain("unit: Unit is required");
      expect(res.body.message).toContain(
        "costPerUnit: Cost per unit must be a non-negative number"
      );
    });

    it("should fail with invalid data type (costPerUnit as string)", async () => {
      const res = await request(app)
        .post("/api/v1/ingredients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...ingredientData,
          ingredientName: "Butter",
          costPerUnit: "abc",
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain(
        "costPerUnit: Cost per unit must be a non-negative number"
      );
    });
  });

  // --- Get All Ingredients Tests (GET /) ---
  describe("GET /", () => {
    it("should allow authenticated user (admin) to get all ingredients", async () => {
      const res = await request(app)
        .get("/api/v1/ingredients")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toEqual(1);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty("_id", ingredientId);
      expect(res.body.data[0].ingredientName).toBe(
        ingredientData.ingredientName
      );
    });

    it("should allow authenticated user (regular) to get all ingredients", async () => {
      const res = await request(app)
        .get("/api/v1/ingredients")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toEqual(1);
    });

    it("should prevent unauthenticated user from getting ingredients", async () => {
      const res = await request(app).get("/api/v1/ingredients");

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe("fail");
    });
  });

  // --- Get Single Ingredient Tests (GET /:id) ---
  describe("GET /:id", () => {
    it("should allow authenticated user to get an ingredient by ID", async () => {
      expect(ingredientId).toBeDefined();
      expect(ingredientId).not.toBeNull();
      const res = await request(app)
        .get(`/api/v1/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(ingredientId);
      expect(res.body.data.ingredientName).toBe(ingredientData.ingredientName);
    });

    it("should fail with invalid MongoDB ID format", async () => {
      const res = await request(app)
        .get(`/api/v1/ingredients/invalidIDformat`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain("id: Invalid ID format");
    });

    it("should return 404 for non-existent ingredient ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/ingredients/${nonExistentId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe("fail");
      expect(res.body.message).toContain("Ingredient not found");
    });

    it("should prevent unauthenticated user from getting ingredient by ID", async () => {
      const res = await request(app).get(`/api/v1/ingredients/${ingredientId}`);

      expect(res.statusCode).toEqual(401);
    });
  });

  // --- Update Ingredient Tests (PUT /:id) ---
  describe("PUT /:id", () => {
    const updatePayload = { costPerUnit: 2.0, supplier: "Supplier B" };

    it("should allow admin to update an ingredient", async () => {
      expect(ingredientId).toBeDefined();
      expect(ingredientId).not.toBeNull();
      const res = await request(app)
        .put(`/api/v1/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.costPerUnit).toBe(updatePayload.costPerUnit);
      expect(res.body.data.supplier).toBe(updatePayload.supplier);
      expect(res.body.data.ingredientName).toBe(ingredientData.ingredientName);

      // Verify in DB
      const updatedIngredient = await Ingredient.findById(ingredientId);
      expect(updatedIngredient.costPerUnit).toBe(updatePayload.costPerUnit);
    });

    it("should prevent regular user from updating an ingredient", async () => {
      const res = await request(app)
        .put(`/api/v1/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ costPerUnit: 2.5 });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe("fail");
    });

    it("should prevent unauthenticated user from updating an ingredient", async () => {
      const res = await request(app)
        .put(`/api/v1/ingredients/${ingredientId}`)
        .send({ costPerUnit: 3.0 });

      expect(res.statusCode).toEqual(401);
    });

    it("should return 404 when trying to update non-existent ingredient", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/ingredients/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.statusCode).toEqual(404);
    });

    it("should fail update with invalid ID format", async () => {
      const res = await request(app)
        .put(`/api/v1/ingredients/invalidID`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe(
        "Validation Error: id: Invalid Ingredient ID format"
      );
    });

    it("should fail update with invalid data type (costPerUnit)", async () => {
      const res = await request(app)
        .put(`/api/v1/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ costPerUnit: "expensive" });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain(
        "costPerUnit: Cost per unit must be a non-negative number"
      );
    });
  });

  // --- Delete Ingredient Tests (DELETE /:id) ---
  describe("DELETE /:id", () => {
    it("should allow admin to delete an ingredient", async () => {
      expect(ingredientId).toBeDefined();
      expect(ingredientId).not.toBeNull();
      const res = await request(app)
        .delete(`/api/v1/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);

      // Verify deletion in DB
      const deletedIngredient = await Ingredient.findById(ingredientId);
      expect(deletedIngredient).toBeNull();
    });

    it("should prevent regular user from deleting an ingredient", async () => {
      expect(ingredientId).toBeDefined();
      expect(ingredientId).not.toBeNull();
      const res = await request(app)
        .delete(`/api/v1/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe("fail");
    });

    it("should prevent unauthenticated user from deleting an ingredient", async () => {
      expect(ingredientId).toBeDefined();
      expect(ingredientId).not.toBeNull();
      const res = await request(app).delete(
        `/api/v1/ingredients/${ingredientId}`
      );

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe("fail");
    });

    it("should return 404 when trying to delete non-existent ingredient", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/ingredients/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe("fail");
    });

    it("should fail delete with invalid ID format", async () => {
      const res = await request(app)
        .delete(`/api/v1/ingredients/badID`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain("id: Invalid ID format");
      expect(res.body.status).toBe("fail");
    });

    // TODO: Add test case for preventing deletion if ingredient is used in recipes
    // This requires setting up Recipe model and data.
    /*
    it('should prevent deletion if ingredient is used in recipes', async () => {
      // 1. Create an ingredient
      // 2. Create a recipe using that ingredient
      // 3. Attempt to delete the ingredient
      // 4. Expect 400 Bad Request with specific error message
    });
    */
  });
});
