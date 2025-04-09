const Ingredient = require("../models/Ingredient");
const Labor = require("../models/Labor");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Calculates the costs for a recipe based on its ingredients, labor, and markup.
 * @param {Array<{ingredient: mongoose.Types.ObjectId, quantity: number}>} ingredientsData - Array of ingredient objects with id and quantity.
 * @param {mongoose.Types.ObjectId} laborId - The ID of the Labor document associated with the recipe.
 * @param {number} markupPercentage - The markup percentage for the recipe.
 * @returns {Promise<Object>} An object containing calculated costs: { totalIngredientCost, totalLaborCost, totalCost, sellingPrice }.
 * @throws {ErrorResponse} If referenced ingredients or labor data are not found.
 */
const calculateRecipeCosts = async (
  ingredientsData,
  laborId,
  markupPercentage
) => {
  // 1. Fetch Labor Cost
  const laborDoc = await Labor.findById(laborId);
  if (!laborDoc) {
    throw new ErrorResponse(`Labor data not found with ID: ${laborId}`, 404);
  }
  const totalLaborCost = laborDoc.laborCostPerPie;

  // 2. Fetch Ingredient Costs
  const ingredientIds = ingredientsData.map((item) => item.ingredient);
  const ingredientDocs = await Ingredient.find({ _id: { $in: ingredientIds } });

  // Create a map for easy lookup
  const ingredientMap = new Map();
  ingredientDocs.forEach((doc) => ingredientMap.set(doc._id.toString(), doc));

  // 3. Calculate Total Ingredient Cost
  let totalIngredientCost = 0;
  for (const item of ingredientsData) {
    const ingredientDoc = ingredientMap.get(item.ingredient.toString());
    if (!ingredientDoc) {
      // This case should ideally be prevented by frontend validation,
      // but good to handle defensively.
      console.warn(
        `Ingredient document not found for ID: ${item.ingredient} during cost calculation.`
      );
      throw new ErrorResponse(
        `Ingredient data not found for ID: ${item.ingredient}`,
        404
      );
      // Or handle differently: continue; // Skip this ingredient? Might lead to inaccurate cost.
    }
    // Basic calculation: quantity * costPerUnit
    // TODO: Add unit conversion logic if recipe unit differs from ingredient base unit
    totalIngredientCost += item.quantity * ingredientDoc.costPerUnit;
  }

  // 4. Calculate Total Cost
  const totalCost = totalIngredientCost + totalLaborCost;

  // 5. Calculate Selling Price
  const sellingPrice = totalCost * (1 + (markupPercentage || 0) / 100);

  // Return calculated values (consider rounding)
  return {
    totalIngredientCost: Math.round(totalIngredientCost * 100) / 100,
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
  };
};

module.exports = {
  calculateRecipeCosts,
};
