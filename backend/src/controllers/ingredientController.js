const Ingredient = require("../models/Ingredient");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all ingredients
// @route   GET /api/v1/ingredients
// @access  Private (requires login)
exports.getAllIngredients = asyncHandler(async (req, res, next) => {
  const ingredients = await Ingredient.find().populate("createdBy", "username"); // Optionally populate creator
  res
    .status(200)
    .json({ success: true, count: ingredients.length, data: ingredients });
});

// @desc    Get single ingredient by ID
// @route   GET /api/v1/ingredients/:id
// @access  Private (requires login)
exports.getIngredientById = asyncHandler(async (req, res, next) => {
  const ingredient = await Ingredient.findById(req.params.id).populate(
    "createdBy",
    "username"
  );

  if (!ingredient) {
    return next(
      new ErrorResponse(`Ingredient not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: ingredient });
});

// @desc    Create new ingredient
// @route   POST /api/v1/ingredients
// @access  Private/Admin
exports.createIngredient = asyncHandler(async (req, res, next) => {
  // Add user to req.body for createdBy field
  req.body.createdBy = req.user.id;

  const ingredient = await Ingredient.create(req.body);

  // Repopulate createdBy after creation to send back username
  const populatedIngredient = await Ingredient.findById(
    ingredient._id
  ).populate("createdBy", "username");

  res.status(201).json({ success: true, data: populatedIngredient });
});

// @desc    Update ingredient
// @route   PUT /api/v1/ingredients/:id
// @access  Private/Admin
exports.updateIngredient = asyncHandler(async (req, res, next) => {
  let ingredient = await Ingredient.findById(req.params.id);

  if (!ingredient) {
    return next(
      new ErrorResponse(`Ingredient not found with id of ${req.params.id}`, 404)
    );
  }

  // TODO: Add logic if ownership matters (e.g., only creator or admin can update)

  ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "username");

  res.status(200).json({ success: true, data: ingredient });
});

// @desc    Delete ingredient
// @route   DELETE /api/v1/ingredients/:id
// @access  Private/Admin
exports.deleteIngredient = asyncHandler(async (req, res, next) => {
  const ingredient = await Ingredient.findById(req.params.id);

  if (!ingredient) {
    return next(
      new ErrorResponse(`Ingredient not found with id of ${req.params.id}`, 404)
    );
  }

  // TODO: Consider implications - should we prevent deletion if ingredient is used in recipes?
  // Add this check if necessary.
  /*
    const recipesUsingIngredient = await Recipe.countDocuments({ 'ingredients.ingredient': req.params.id });
    if (recipesUsingIngredient > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete ingredient as it is used in ${recipesUsingIngredient} recipe(s)`,
          400
        )
      );
    }
    */

  await ingredient.deleteOne();

  res.status(200).json({ success: true, data: {} }); // Or 204 No Content
});
