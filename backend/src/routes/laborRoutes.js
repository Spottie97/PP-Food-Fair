const express = require("express");
const {
  getAllLabor,
  getLaborById,
  createLabor,
  updateLabor,
  deleteLabor,
} = require("../controllers/laborController");
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

// Validation rules for creating labor data
const createLaborValidationRules = [
  check("pieName", "Pie name is required").not().isEmpty().isString(),
  check("costPerHour", "Cost per hour must be a non-negative number").isFloat({
    min: 0,
  }),
  check(
    "minutesPerPie",
    "Minutes per pie must be a non-negative number"
  ).isFloat({
    min: 0,
  }),
];

// Validation rules for updating labor data
const updateLaborValidationRules = [
  param("id", "Invalid Labor ID format").custom(isValidObjectId),
  body("pieName", "Pie name must be a non-empty string")
    .optional()
    .not()
    .isEmpty()
    .isString(),
  body("costPerHour", "Cost per hour must be a non-negative number")
    .optional()
    .isFloat({ min: 0 }),
  body("minutesPerPie", "Minutes per pie must be a non-negative number")
    .optional()
    .isFloat({ min: 0 }),
];

// Validation rules for routes requiring just an ID param
const idParamValidationRules = [
  param("id", "Invalid ID format").custom(isValidObjectId),
];

// Apply protect middleware to all routes below
router.use(protect);

router
  .route("/")
  .get(getAllLabor) // Any logged-in user can view labor data
  .post(
    authorize("admin"), // Only admin can create
    createLaborValidationRules,
    validateRequest,
    createLabor
  );

router
  .route("/:id")
  .get(idParamValidationRules, validateRequest, getLaborById) // Any logged-in user
  .put(
    authorize("admin"), // Only admin can update
    updateLaborValidationRules,
    validateRequest,
    updateLabor
  )
  .delete(
    authorize("admin"), // Only admin can delete
    idParamValidationRules,
    validateRequest,
    deleteLabor
  );

module.exports = router;
