const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");

// Subdocument for ingredients within a recipe
const RecipeIngredientSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, "Please specify the quantity"],
      min: [0, "Quantity cannot be negative"],
    },
    // Unit here should ideally match the Ingredient's unit or be convertible
    unit: {
      type: String,
      required: [true, "Please specify the unit for this recipe ingredient"],
    },
  },
  {
    _id: false, // Don't create a separate _id for subdocuments
  }
);

// Sub-schema for detailed labor inputs
const laborInputSchema = new mongoose.Schema(
  {
    workers: {
      type: Number,
      required: true,
      min: 1,
    },
    hoursPerWorker: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const RecipeSchema = new mongoose.Schema({
  pieName: {
    type: String,
    required: [true, "Please provide a pie name"],
    unique: true,
    trim: true,
  },
  variant: {
    type: String,
    required: true,
    trim: true,
    default: "Standard",
  },
  batchSize: {
    type: Number,
    required: true,
    min: 1,
  },
  ingredients: [RecipeIngredientSchema],
  laborInputs: [laborInputSchema],
  laborHourlyRate: {
    type: Number,
    required: true,
    min: 0,
  },
  // Store calculated costs for efficiency
  calculatedCosts: {
    totalIngredientCost: { type: Number, default: 0 },
    totalLaborCost: { type: Number, default: 0 },
    totalBatchCost: { type: Number, default: 0 },
    costPerPie: { type: Number, default: 0 },
  },
  markupPercentage: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  labor: {
    // Reference to the specific labor cost for this pie
    type: mongoose.Schema.Types.ObjectId,
    ref: "Labor",
  },
  // Calculated fields (likely populated by a service/controller)
  totalIngredientCost: {
    type: Number,
  },
  totalLaborCost: {
    // Should match the laborCostPerPie from the referenced Labor doc
    type: Number,
  },
  totalCost: {
    // totalIngredientCost + totalLaborCost
    type: Number,
  },
  notes: {
    type: String,
    trim: true,
  },
});

// Compound unique index to ensure only one recipe per name/variant combination
RecipeSchema.index({ pieName: 1, variant: 1 }, { unique: true });

// Pre-save hook to update timestamps
RecipeSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  // Potentially recalculate costs here or trigger it via a method
  next();
});

// Method to calculate total ingredient cost for the batch
RecipeSchema.methods.calculateIngredientCost = async function () {
  let totalCost = 0;
  // Ensure ingredients are populated
  await this.populate({ path: "ingredients.ingredient", model: "Ingredient" });

  for (const item of this.ingredients) {
    if (!item.ingredient || typeof item.ingredient.costPerUnit !== "number") {
      console.error(
        `Ingredient data missing or invalid cost for recipe "${this.pieName} - ${this.variant}". Ingredient ID: ${item.ingredient?._id}`
      );
      throw new ErrorResponse(
        `Invalid or missing data for ingredient ID: ${
          item.ingredient?._id || "[provided ID is missing/invalid]"
        }`,
        400
      );
    }
    // Calculation: quantity (in kg/L) * costPerUnit (cost per kg/L)
    totalCost += item.quantity * item.ingredient.costPerUnit;
  }
  // Round to sensible precision (e.g., 4 decimal places) during calculation
  return Math.round(totalCost * 10000) / 10000;
};

// Method to calculate total labor cost for the batch
RecipeSchema.methods.calculateLaborCost = function () {
  let totalLaborHours = 0;
  for (const input of this.laborInputs) {
    totalLaborHours += input.workers * input.hoursPerWorker;
  }
  const totalCost = totalLaborHours * this.laborHourlyRate;
  // Round to sensible precision
  return Math.round(totalCost * 10000) / 10000;
};

// Method to calculate all costs AND the final selling price, then update the document fields
// IMPORTANT: This method *does not* save the document. Call .save() after calling this.
RecipeSchema.methods.updateCalculatedCostsAndPrice = async function () {
  try {
    this.calculatedCosts.totalIngredientCost =
      await this.calculateIngredientCost();
    this.calculatedCosts.totalLaborCost = this.calculateLaborCost();
    this.calculatedCosts.totalBatchCost =
      (this.calculatedCosts.totalIngredientCost || 0) +
      (this.calculatedCosts.totalLaborCost || 0);

    if (this.batchSize > 0) {
      this.calculatedCosts.costPerPie =
        this.calculatedCosts.totalBatchCost / this.batchSize;
    } else {
      this.calculatedCosts.costPerPie = 0; // Avoid division by zero
    }

    // Calculate selling price based on costPerPie and markupPercentage
    const markupMultiplier = 1 + this.markupPercentage / 100;
    this.sellingPrice = this.calculatedCosts.costPerPie * markupMultiplier;

    // Optional: Round final costs and prices to 2 decimal places for display/storage
    this.calculatedCosts.totalIngredientCost =
      Math.round(this.calculatedCosts.totalIngredientCost * 100) / 100;
    this.calculatedCosts.totalLaborCost =
      Math.round(this.calculatedCosts.totalLaborCost * 100) / 100;
    this.calculatedCosts.totalBatchCost =
      Math.round(this.calculatedCosts.totalBatchCost * 100) / 100;
    this.calculatedCosts.costPerPie =
      Math.round(this.calculatedCosts.costPerPie * 100) / 100;
    this.sellingPrice = Math.round(this.sellingPrice * 100) / 100;
  } catch (error) {
    console.error(
      `Error calculating costs for recipe "${this.pieName} - ${this.variant}":`,
      error
    );
    // Re-throw or handle as needed
    throw error;
  }
};

// TODO: Add methods for calculating costs based on ingredients and other factors
// Example: RecipeSchema.methods.calculateCosts = async function() { ... }

module.exports = mongoose.model("Recipe", RecipeSchema);
