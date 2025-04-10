const express = require("express");
const {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  importIngredients,
  bulkDeleteIngredients,
} = require("../controllers/ingredientController");
const { check, param, body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware to handle validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((err) => `${err.path}: ${err.msg}`)
      .join("; ");
    return next(new ErrorResponse(`Validation Error: ${errorMessages}`, 400));
  }
  next();
};

// Validation helper for ObjectId
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Validation rules for creating an ingredient
const createIngredientValidationRules = [
  check("ingredientName", "Ingredient name is required").not().isEmpty(),
  check("unit", "Unit is required").not().isEmpty(),
  check("costPerUnit", "Cost per unit must be a non-negative number").isFloat({
    min: 0,
  }),
  check("supplier", "Supplier must be a string").optional().isString(),
  check("category", "Invalid category value")
    .optional()
    .isIn(["Produce", "Meat", "Dairy", "Pantry", "Spices", "Other"]),
];

// Validation rules for updating an ingredient
const updateIngredientValidationRules = [
  param("id", "Invalid Ingredient ID format").custom(isValidObjectId),
  body("ingredientName", "Ingredient name must be a non-empty string")
    .optional()
    .not()
    .isEmpty(),
  body("unit", "Unit must be a non-empty string").optional().not().isEmpty(),
  body("costPerUnit", "Cost per unit must be a non-negative number")
    .optional()
    .isFloat({ min: 0 }),
  body("supplier", "Supplier must be a string").optional().isString(),
  body("category", "Invalid category value")
    .optional()
    .isIn(["Produce", "Meat", "Dairy", "Pantry", "Spices", "Other"]),
];

// Validation rules for routes requiring just an ID param
const idParamValidationRules = [
  param("id", "Invalid ID format").custom(isValidObjectId),
];

// Apply protect middleware to all routes below
router.use(protect);

router
  .route("/")
  .get(getAllIngredients) // Any logged-in user can view ingredients
  .post(
    authorize("admin", "manager"), // Allow admin and manager
    createIngredientValidationRules,
    validateRequest,
    createIngredient
  );

router
  .route("/:id")
  .get(idParamValidationRules, validateRequest, getIngredientById) // Any logged-in user
  .put(
    authorize("admin", "manager"), // Allow admin and manager
    updateIngredientValidationRules,
    validateRequest,
    updateIngredient
  )
  .delete(
    authorize("admin", "manager"), // Allow admin and manager
    idParamValidationRules,
    validateRequest,
    deleteIngredient
  );

router.delete(
  "/bulk-delete",
  authorize("admin", "manager"),
  bulkDeleteIngredients
);

router.post("/import", authorize("admin", "manager"), importIngredients);

module.exports = router;
