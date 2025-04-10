const express = require("express");
const {
  getAllUsers,
  getUser,
  updateUserRole,
  deleteUser,
  // deleteUser
} = require("../controllers/userController");

const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");

// All routes below this middleware are protected and require admin role
router.use(protect);
router.use(authorize("admin"));

router.route("/").get(getAllUsers);

router.route("/:id").get(getUser);
// Use a more specific path for updating the role
router.route("/:id/role").put(updateUserRole);

// Add DELETE route for deleting a user (still admin only due to middleware above)
router.route("/:id").delete(deleteUser);

// router.route('/:id').delete(deleteUser); // Optional: Add delete route if needed

module.exports = router;
