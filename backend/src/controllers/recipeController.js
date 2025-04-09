const Recipe = require("../models/Recipe");
const Ingredient = require("../models/Ingredient");
const Labor = require("../models/Labor");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { calculateRecipeCosts } = require("../services/pricingService");

// @desc    Get all recipes
// @route   GET /api/v1/recipes
// @access  Private (example, adjust as needed)
exports.getAllRecipes = asyncHandler(async (req, res, next) => {
  // Populate ingredients and labor details
  const recipes = await Recipe.find()
    .populate("ingredients.ingredient") // Populate ingredient details
    .populate("labor"); // Populate labor details

  res.status(200).json({ success: true, count: recipes.length, data: recipes });
});

// @desc    Get single recipe by ID
// @route   GET /api/v1/recipes/:id
// @access  Private (example, adjust as needed)
exports.getRecipeById = asyncHandler(async (req, res, next) => {
  const recipe = await Recipe.findById(req.params.id)
    .populate("ingredients.ingredient")
    .populate("labor");

  if (!recipe) {
    return next(
      new ErrorResponse(`Recipe not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: recipe });
});

// @desc    Create new recipe
// @route   POST /api/v1/recipes
// @access  Private/Admin (example)
exports.createRecipe = asyncHandler(async (req, res, next) => {
  const {
    pieName,
    variant,
    batchSize,
    ingredients,
    laborInputs,
    laborHourlyRate,
    markupPercentage,
    notes,
  } = req.body;

  // Basic validation (more detailed validation can be in routes)
  if (
    !pieName ||
    !batchSize ||
    !ingredients ||
    ingredients.length === 0 ||
    !laborInputs ||
    laborInputs.length === 0 ||
    typeof laborHourlyRate === "undefined" ||
    typeof markupPercentage === "undefined"
  ) {
    return next(
      new ErrorResponse(
        "Missing required fields (pieName, batchSize, ingredients, laborInputs, laborHourlyRate, markupPercentage)",
        400
      )
    );
  }

  // Create a new recipe instance (without calculated costs initially)
  const recipe = new Recipe({
    pieName,
    variant: variant || "Standard", // Default variant if not provided
    batchSize,
    ingredients,
    laborInputs,
    laborHourlyRate,
    markupPercentage,
    notes,
    // createdBy: req.user.id, // Assuming protect middleware adds user
  });

  // Calculate costs using the instance method
  await recipe.updateCalculatedCostsAndPrice();

  // Save the recipe with calculated costs
  await recipe.save();

  // Repopulate after saving to send full details back
  // Manually populate ingredients.ingredient if needed after save
  const populatedRecipe = await Recipe.findById(recipe._id).populate(
    "ingredients.ingredient"
  );
  // Note: Labor is no longer a direct ref, so no .populate('labor')

  res.status(201).json({ success: true, data: populatedRecipe });
});

// @desc    Update recipe
// @route   PUT /api/v1/recipes/:id
// @access  Private/Admin (example)
exports.updateRecipe = asyncHandler(async (req, res, next) => {
  const recipeId = req.params.id;
  const updateData = req.body;

  let recipe = await Recipe.findById(recipeId);

  if (!recipe) {
    return next(
      new ErrorResponse(`Recipe not found with id of ${recipeId}`, 404)
    );
  }

  // Apply updates from request body to the recipe instance
  // Use Object.assign for cleaner updates, potentially filter allowed fields
  Object.assign(recipe, updateData);

  // Always recalculate costs using the instance method before saving
  await recipe.updateCalculatedCostsAndPrice();

  // Save the updated recipe
  await recipe.save();

  // Repopulate necessary fields after saving
  // Ensure ingredients are populated for the response
  // Remove .populate('labor') as it's no longer a direct reference
  const populatedRecipe = await Recipe.findById(recipe._id).populate(
    "ingredients.ingredient"
  );

  res.status(200).json({ success: true, data: populatedRecipe });
});

// @desc    Delete recipe
// @route   DELETE /api/v1/recipes/:id
// @access  Private/Admin (example)
exports.deleteRecipe = asyncHandler(async (req, res, next) => {
  const recipe = await Recipe.findById(req.params.id);

  if (!recipe) {
    return next(
      new ErrorResponse(`Recipe not found with id of ${req.params.id}`, 404)
    );
  }

  // TODO: Consider implications of deleting a recipe (e.g., historical data)
  // Maybe add a soft delete (isDeleted flag) instead?

  await recipe.deleteOne(); // Use deleteOne() on the document instance

  res.status(200).json({ success: true, data: {} }); // Or status 2 E4 No Content
});
