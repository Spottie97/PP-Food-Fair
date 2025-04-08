const mongoose = require("mongoose");

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

const RecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a recipe name"],
    unique: true,
    trim: true,
  },
  pieType: {
    type: String,
    required: [true, "Please specify the pie type"],
    // Example types based on the Excel file
    enum: [
      "Chicken Mayonnaise",
      "Basic Mince",
      "Venison",
      "Steak and Kidney",
      "Spinach and Feta",
      "Pepper Steak",
      "Lamb Curry",
      "Cornish",
      "Other",
    ],
    default: "Other",
  },
  description: {
    type: String,
    trim: true,
  },
  ingredients: [RecipeIngredientSchema],
  // Additional costs (e.g., pastry, packaging, labor)
  pastryCost: {
    type: Number,
    default: 0,
  },
  packagingCost: {
    type: Number,
    default: 0,
  },
  laborCostPerHour: {
    type: Number,
    default: 0,
  },
  laborTimeMinutes: {
    type: Number, // Time in minutes to make one batch or pie
    default: 0,
  },
  overheadPercentage: {
    type: Number, // e.g., 10 for 10%
    default: 0,
  },
  profitMarginPercentage: {
    type: Number, // e.g., 20 for 20%
    default: 0,
  },
  // Calculated fields (can be virtual or stored)
  totalIngredientCost: {
    type: Number,
    default: 0,
  },
  totalLaborCost: {
    type: Number,
    default: 0,
  },
  totalManufacturingCost: {
    type: Number,
    default: 0,
  },
  sellingPrice: {
    type: Number,
    default: 0,
  },
  lastCalculated: {
    type: Date,
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
});

// Pre-save hook to update timestamps
RecipeSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  // Potentially recalculate costs here or trigger it via a method
  next();
});

// TODO: Add methods for calculating costs based on ingredients and other factors
// Example: RecipeSchema.methods.calculateCosts = async function() { ... }

module.exports = mongoose.model("Recipe", RecipeSchema);
