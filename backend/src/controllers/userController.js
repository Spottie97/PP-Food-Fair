const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  // No need to check role here, handled by middleware protection on the route
  const users = await User.find({});
  res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Get single user (Optional - might not be needed for role management)
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorResponse(`User not found with id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({ success: true, data: user });
});

// @desc    Update user role
// @route   PUT /api/v1/users/:id/role
// @access  Private/Admin
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;

  // Validate the provided role
  if (!role || !["admin", "user", "manager"].includes(role)) {
    return next(
      new ErrorResponse(
        "Invalid role provided. Must be 'admin', 'user', or 'manager'",
        400
      )
    );
  }

  const userToUpdate = await User.findById(req.params.id);

  if (!userToUpdate) {
    return next(
      new ErrorResponse(`User not found with id ${req.params.id}`, 404)
    );
  }

  // Prevent admin from changing their own role via this endpoint (safer)
  if (userToUpdate._id.toString() === req.user.id) {
    return next(
      new ErrorResponse(
        "Admins cannot change their own role via this interface",
        403
      )
    );
  }

  // Update the role
  userToUpdate.role = role;
  await userToUpdate.save({ validateBeforeSave: true }); // Ensure validation runs

  console.log(
    `User role updated: ${userToUpdate.email} set to ${role} by ${req.user.email}`
  );

  res.status(200).json({ success: true, data: userToUpdate });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const userToDelete = await User.findById(req.params.id);

  if (!userToDelete) {
    return next(
      new ErrorResponse(`User not found with id ${req.params.id}`, 404)
    );
  }

  // Prevent admin from deleting themselves
  if (userToDelete._id.toString() === req.user.id) {
    return next(new ErrorResponse("Admins cannot delete themselves", 403));
  }

  // Optional TODO: Add checks here if you want to prevent deletion based on other criteria
  // e.g., if the user has created recipes/ingredients, reassign them or prevent deletion?

  await userToDelete.deleteOne(); // Use deleteOne() on the document instance
  console.log(
    `User deleted: ${userToDelete.email} (ID: ${userToDelete._id}) by ${req.user.email} (ID: ${req.user.id})`
  );

  res.status(200).json({ success: true, data: {} }); // Or 204 No Content
});
