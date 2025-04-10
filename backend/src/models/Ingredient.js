const mongoose = require("mongoose");

const IngredientSchema = new mongoose.Schema(
  {
    ingredientName: {
      type: String,
      required: [true, "Please provide an ingredient name"],
      unique: true,
      trim: true,
    },
    unit: {
      type: String,
      required: [true, "Please provide a unit"],
      trim: true,
    },
    costPerUnit: {
      type: Number,
      required: [true, "Please provide the cost per unit"],
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Update lastUpdated timestamp before saving
IngredientSchema.pre("save", function (next) {
  this.createdAt = Date.now();
  next();
});

module.exports = mongoose.model("Ingredient", IngredientSchema);
