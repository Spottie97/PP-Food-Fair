const mongoose = require("mongoose");

const LaborSchema = new mongoose.Schema({
  pieName: {
    // Link labor cost to a specific pie type
    type: String,
    required: [true, "Please provide the associated pie name"],
    unique: true, // Assuming one labor cost entry per pie type for now
    trim: true,
  },
  costPerHour: {
    type: Number,
    required: [true, "Please provide the labor cost per hour"],
  },
  minutesPerPie: {
    // Time taken for this specific pie type
    type: Number,
    required: [true, "Please provide the minutes per pie"],
  },
  laborCostPerPie: {
    // Calculated cost per pie (costPerHour * (minutesPerPie / 60))
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Optional: Pre-save hook to calculate laborCostPerPie if needed,
// although this was likely calculated during migration.
// LaborSchema.pre('save', function(next) {
//   if (this.isModified('costPerHour') || this.isModified('minutesPerPie')) {
//     this.laborCostPerPie = (this.costPerHour * (this.minutesPerPie / 60));
//   }
//   next();
// });

module.exports = mongoose.model("Labor", LaborSchema);
