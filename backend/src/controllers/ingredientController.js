const Ingredient = require("../models/Ingredient");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const { logger } = require("../utils/logger"); // Import logger for detailed logging

// @desc    Get all ingredients
// @route   GET /api/v1/ingredients
// @access  Private (requires login)
exports.getAllIngredients = asyncHandler(async (req, res, next) => {
  const ingredients = await Ingredient.find()
    .populate("createdBy", "username")
    .populate("updatedBy", "username"); // Populate updatedBy
  res
    .status(200)
    .json({ success: true, count: ingredients.length, data: ingredients });
});

// @desc    Get single ingredient by ID
// @route   GET /api/v1/ingredients/:id
// @access  Private (requires login)
exports.getIngredientById = asyncHandler(async (req, res, next) => {
  const ingredient = await Ingredient.findById(req.params.id)
    .populate("createdBy", "username")
    .populate("updatedBy", "username"); // Populate updatedBy

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
// @access  Private/Admin or Manager
exports.updateIngredient = asyncHandler(async (req, res, next) => {
  let ingredient = await Ingredient.findById(req.params.id);

  if (!ingredient) {
    return next(
      new ErrorResponse(`Ingredient not found with id of ${req.params.id}`, 404)
    );
  }

  // Add the user performing the update to the request body
  req.body.updatedBy = req.user.id;

  // Find and update, then populate both createdBy and updatedBy
  ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("createdBy", "username")
    .populate("updatedBy", "username");

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

// @desc    Import ingredients from JSON data (parsed from Excel)
// @route   POST /api/v1/ingredients/import
// @access  Private/Admin or Manager
exports.importIngredients = asyncHandler(async (req, res, next) => {
  const ingredientsData = req.body;
  const userId = req.user.id; // Get user ID for createdBy/updatedBy

  if (!Array.isArray(ingredientsData) || ingredientsData.length === 0) {
    return next(
      new ErrorResponse("No ingredient data provided or invalid format", 400)
    );
  }

  let createdCount = 0;
  let updatedCount = 0;
  const errors = [];
  const results = [];

  logger.info(
    `Starting ingredient import for ${ingredientsData.length} records by user ${req.user.email}`
  );

  // Process each record from the input data
  for (const record of ingredientsData) {
    // Extract and validate necessary fields - map from expected Excel headers
    const ingredientName = record["Ingredient Name"]?.trim();

    // --- Robustness: Silently skip rows completely missing an ingredient name ---
    if (!ingredientName) {
      // logger.debug("Skipping row with missing Ingredient Name."); // Optional: Debug log if needed
      continue; // Skip this row entirely
    }

    const unit = record["Unit"]?.trim();
    const costString = record["Cost per Unit (R)"];
    const supplier = record["Supplier"]?.trim() || undefined; // Use undefined if empty
    const category = record["Category"]?.trim() || undefined; // Use undefined if empty

    // Validation (Now that we know ingredientName exists)
    if (!unit || typeof costString === "undefined") {
      logger.warn(
        `Skipping record '${ingredientName}' due to missing required fields: Unit='${unit}', Cost='${costString}'`
      );
      errors.push(
        `Skipped record: Missing required fields (Unit, Cost per Unit) for '${ingredientName}'.`
      );
      continue;
    }

    // Parse costPerUnit carefully
    const costPerUnit = parseFloat(costString);
    if (isNaN(costPerUnit) || costPerUnit < 0) {
      logger.warn(
        `Skipping record due to invalid cost: Name='${ingredientName}', Cost='${costString}'`
      );
      errors.push(
        `Skipped record: Invalid Cost per Unit '${costString}' for '${ingredientName}'.`
      );
      continue;
    }

    try {
      const updateData = {
        unit,
        costPerUnit,
        supplier,
        category,
        updatedBy: userId, // Set who last updated/created this record via import
      };

      // Upsert based on ingredientName (case-insensitive search for robustness)
      const result = await Ingredient.findOneAndUpdate(
        { ingredientName: { $regex: `^${ingredientName}$`, $options: "i" } }, // Case-insensitive match
        {
          $set: updateData,
          $setOnInsert: {
            // Fields to set only when creating a new document
            ingredientName: ingredientName, // Ensure name case is preserved on insert
            createdBy: userId,
          },
        },
        {
          upsert: true,
          new: true, // Return the modified or new document
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      // Check if the document was newly created or updated
      // Mongoose doesn't directly tell you if it was an upsert creation vs update easily in this flow.
      // We can infer based on whether createdBy was set in this operation.
      if (
        result.createdBy &&
        result.createdBy.toString() === userId &&
        (!result.updatedAt ||
          result.createdAt.getTime() === result.updatedAt.getTime())
      ) {
        // Heuristic: If createdBy matches current user and timestamps are identical, likely created now.
        createdCount++;
        results.push(`Created: ${result.ingredientName}`);
        logger.debug(
          `Import - Created: ${result.ingredientName} (ID: ${result._id})`
        );
      } else {
        updatedCount++;
        results.push(`Updated: ${result.ingredientName}`);
        logger.debug(
          `Import - Updated: ${result.ingredientName} (ID: ${result._id})`
        );
      }
    } catch (error) {
      logger.error(
        `Error processing record for '${ingredientName}': ${error.message}`,
        error
      );
      errors.push(`Error processing '${ingredientName}': ${error.message}`);
    }
  }

  logger.info(
    `Ingredient import finished. Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errors.length}`
  );

  res.status(200).json({
    success: true,
    message: `Import finished. Created: ${createdCount}, Updated: ${updatedCount}.`,
    createdCount,
    updatedCount,
    errors, // Send back any errors encountered
    // results, // Optionally send detailed results (might be large)
  });
});

// @desc    Delete multiple ingredients by ID
// @route   DELETE /api/v1/ingredients/bulk-delete
// @access  Private/Admin or Manager
exports.bulkDeleteIngredients = asyncHandler(async (req, res, next) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return next(
      new ErrorResponse("No ingredient IDs provided for deletion", 400)
    );
  }

  // Optional: Add more validation for IDs if necessary (e.g., check if they are valid ObjectIds)

  // TODO: Consider implications - should we prevent deletion if any ingredient is used in recipes?
  // This check is more complex for bulk operations. One strategy:
  // 1. Find all recipes that use *any* of the ingredients in the `ids` array.
  // 2. If any are found, return an error listing the ingredients that cannot be deleted.
  // Example check (needs Recipe model imported):
  /*
  const Recipe = require('../models/Recipe');
  const usedIngredients = await Recipe.find({ 'ingredients.ingredient': { $in: ids } }).distinct('ingredients.ingredient');
  const usedIngredientIds = usedIngredients.map(id => id.toString());
  const deletableIds = ids.filter(id => !usedIngredientIds.includes(id));
  const nonDeletableIds = ids.filter(id => usedIngredientIds.includes(id));

  if (nonDeletableIds.length > 0) {
      // Fetch names for better error message
      const nonDeletableIngredients = await Ingredient.find({ _id: { $in: nonDeletableIds } }).select('ingredientName');
      const names = nonDeletableIngredients.map(ing => ing.ingredientName).join(', ');
      errors.push(`Cannot delete ingredients currently used in recipes: ${names}.`);
      // Decide whether to proceed deleting the others or stop entirely
      if (deletableIds.length === 0) {
          return next(new ErrorResponse(`Cannot delete ingredients currently used in recipes: ${names}`, 400));
      }
      // Modify `ids` to only include `deletableIds` if proceeding partially
      // ids = deletableIds; 
  }
  */

  try {
    const result = await Ingredient.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
      // This could happen if the IDs were invalid or already deleted
      logger.warn(
        `Bulk delete requested for IDs [${ids.join(
          ", "
        )}] but none were found/deleted.`
      );
      // Return success but indicate nothing was deleted
      return res
        .status(200)
        .json({
          success: true,
          message: "No matching ingredients found to delete.",
          deletedCount: 0,
        });
    }

    logger.info(
      `Bulk delete successful: ${
        result.deletedCount
      } ingredient(s) deleted by ${req.user.email}. IDs: [${ids.join(", ")}]`
    );
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error(
      `Bulk delete error for IDs [${ids.join(", ")}]: ${error.message}`,
      error
    );
    next(new ErrorResponse("An error occurred during bulk deletion.", 500)); // Generic error for safety
  }
});
