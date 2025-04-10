const express = require("express");
const {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} = require("../controllers/recipeController");
const { check, body, param, validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");

const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");

// Middleware to handle validation errors (similar to authRoutes)
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

// Validation rules for creating a recipe
const createRecipeValidationRules = [
  check("pieName", "Pie name is required and must be a string")
    .not()
    .isEmpty()
    .isString(),
  check("batchSize", "Batch size must be a positive integer").isInt({ gt: 0 }),
  check("ingredients", "Ingredients must be a non-empty array").isArray({
    min: 1,
  }),
  check(
    "ingredients.*.ingredient",
    "Each ingredient must have a valid ingredient ID"
  ).custom(isValidObjectId),
  check(
    "ingredients.*.quantity",
    "Each ingredient quantity must be a positive number"
  ).isFloat({ gt: 0 }),
  check(
    "ingredients.*.unit",
    "Each ingredient unit is required and must be a string"
  )
    .not()
    .isEmpty()
    .isString(),
  check("laborInputs", "Labor inputs must be a non-empty array").isArray({
    min: 1,
  }),
  check(
    "laborInputs.*.workers",
    "Each labor input must specify workers as a positive integer"
  ).isInt({ gt: 0 }),
  check(
    "laborInputs.*.hoursPerWorker",
    "Each labor input must specify hours per worker as a non-negative number"
  ).isFloat({ min: 0 }),
  check(
    "laborHourlyRate",
    "Labor hourly rate must be a non-negative number"
  ).isFloat({ min: 0 }),
  check(
    "markupPercentage",
    "Markup percentage must be a non-negative number"
  ).isFloat({ min: 0 }),
  check("notes", "Notes must be a string").optional().isString(),
];

// Validation rules for updating a recipe
const updateRecipeValidationRules = [
  param("id", "Invalid Recipe ID format").custom(isValidObjectId),
  body("pieName", "Pie name must be a non-empty string")
    .optional()
    .not()
    .isEmpty()
    .isString(),
  body("batchSize", "Batch size must be a positive integer")
    .optional()
    .isInt({ gt: 0 }),
  body("ingredients", "Ingredients must be a non-empty array")
    .optional()
    .isArray({ min: 1 }),
  body(
    "ingredients.*.ingredient",
    "Each ingredient must have a valid ingredient ID"
  )
    .optional()
    .custom(isValidObjectId),
  body(
    "ingredients.*.quantity",
    "Each ingredient quantity must be a positive number"
  )
    .optional()
    .isFloat({ gt: 0 }),
  body("ingredients.*.unit", "Each ingredient unit must be a non-empty string")
    .optional()
    .not()
    .isEmpty()
    .isString(),
  body("laborInputs", "Labor inputs must be a non-empty array")
    .optional()
    .isArray({ min: 1 }),
  body(
    "laborInputs.*.workers",
    "Each labor input must specify workers as a positive integer"
  )
    .optional()
    .isInt({ gt: 0 }),
  body(
    "laborInputs.*.hoursPerWorker",
    "Each labor input must specify hours per worker as a non-negative number"
  )
    .optional()
    .isFloat({ min: 0 }),
  body("laborHourlyRate", "Labor hourly rate must be a non-negative number")
    .optional()
    .isFloat({ min: 0 }),
  body("markupPercentage", "Markup percentage must be a non-negative number")
    .optional()
    .isFloat({ min: 0 }),
  body("notes", "Notes must be a string").optional().isString(),
];

// Validation rules for routes requiring just an ID param
const idParamValidationRules = [
  param("id", "Invalid ID format").custom(isValidObjectId),
];

// Apply protect middleware to all routes below
// For more granular control, apply middleware individually
router.use(protect);

// Public route example (if needed) - place before router.use(protect)
// router.get('/public', getAllPublicRecipes);

router
  .route("/")
  .get(getAllRecipes) // Anyone logged in can view
  .post(
    authorize("admin", "manager"),
    createRecipeValidationRules,
    validateRequest,
    createRecipe
  );

router
  .route("/:id")
  .get(idParamValidationRules, validateRequest, getRecipeById)
  .put(
    authorize("admin", "manager"),
    updateRecipeValidationRules,
    validateRequest,
    updateRecipe
  )
  .delete(
    authorize("admin", "manager"),
    idParamValidationRules,
    validateRequest,
    deleteRecipe
  );

module.exports = router;
