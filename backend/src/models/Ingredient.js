const mongoose = require("mongoose");

const IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add an ingredient name"],
    unique: true,
    trim: true,
  },
  unit: {
    type: String,
    required: [
      true,
      "Please specify the unit of measurement (e.g., kg, g, ml, each)",
    ],
  },
  costPerUnit: {
    type: Number,
    required: [true, "Please add the cost per unit"],
    min: [0, "Cost per unit cannot be negative"],
  },
  supplier: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ["Produce", "Meat", "Dairy", "Pantry", "Spices", "Other"],
    default: "Other",
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

// Update lastUpdated timestamp before saving
IngredientSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("Ingredient", IngredientSchema);
