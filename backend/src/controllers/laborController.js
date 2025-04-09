const Labor = require("../models/Labor");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// Helper function to calculate labor cost per pie
const calculateCostPerPie = (costPerHour, minutesPerPie) => {
  if (costPerHour < 0 || minutesPerPie < 0) return 0;
  return costPerHour * (minutesPerPie / 60);
};

// @desc    Get all labor data
// @route   GET /api/v1/labor
// @access  Private
exports.getAllLabor = asyncHandler(async (req, res, next) => {
  const laborData = await Labor.find();
  res
    .status(200)
    .json({ success: true, count: laborData.length, data: laborData });
});

// @desc    Get single labor data entry by ID
// @route   GET /api/v1/labor/:id
// @access  Private
exports.getLaborById = asyncHandler(async (req, res, next) => {
  const labor = await Labor.findById(req.params.id);

  if (!labor) {
    return next(
      new ErrorResponse(`Labor data not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: labor });
});

// @desc    Create new labor data entry
// @route   POST /api/v1/labor
// @access  Private/Admin
exports.createLabor = asyncHandler(async (req, res, next) => {
  const { pieName, costPerHour, minutesPerPie } = req.body;

  // Calculate laborCostPerPie before creating
  const laborCostPerPie = calculateCostPerPie(costPerHour, minutesPerPie);

  const labor = await Labor.create({
    pieName,
    costPerHour,
    minutesPerPie,
    laborCostPerPie,
  });

  res.status(201).json({ success: true, data: labor });
});

// @desc    Update labor data entry
// @route   PUT /api/v1/labor/:id
// @access  Private/Admin
exports.updateLabor = asyncHandler(async (req, res, next) => {
  let labor = await Labor.findById(req.params.id);

  if (!labor) {
    return next(
      new ErrorResponse(`Labor data not found with id of ${req.params.id}`, 404)
    );
  }

  // Recalculate laborCostPerPie if relevant fields are updated
  const updatedData = { ...req.body };
  const costPerHour = updatedData.costPerHour ?? labor.costPerHour; // Use existing if not provided
  const minutesPerPie = updatedData.minutesPerPie ?? labor.minutesPerPie; // Use existing if not provided

  if (
    typeof updatedData.costPerHour !== "undefined" ||
    typeof updatedData.minutesPerPie !== "undefined"
  ) {
    updatedData.laborCostPerPie = calculateCostPerPie(
      costPerHour,
      minutesPerPie
    );
  }

  labor = await Labor.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: labor });
});

// @desc    Delete labor data entry
// @route   DELETE /api/v1/labor/:id
// @access  Private/Admin
exports.deleteLabor = asyncHandler(async (req, res, next) => {
  const labor = await Labor.findById(req.params.id);

  if (!labor) {
    return next(
      new ErrorResponse(`Labor data not found with id of ${req.params.id}`, 404)
    );
  }

  // TODO: Consider implications - prevent deletion if labor data is used in recipes?
  // Add check similar to ingredients if needed.
  /*
    const recipesUsingLabor = await Recipe.countDocuments({ labor: req.params.id });
    if (recipesUsingLabor > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete labor data as it is used in ${recipesUsingLabor} recipe(s)`,
          400
        )
      );
    }
  */

  await labor.deleteOne();

  res.status(200).json({ success: true, data: {} }); // Or 204 No Content
});
