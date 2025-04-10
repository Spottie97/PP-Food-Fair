const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); // Import crypto for token generation

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please provide a username"],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ],
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 6,
    select: false, // Do not return password by default
  },
  role: {
    type: String,
    enum: ["user", "admin", "manager"], // Add 'manager' role
    default: "user",
  },
  // Email Verification Fields
  isVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,

  // Password Reset Fields
  passwordResetToken: String,
  passwordResetExpire: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt before saving
UserSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) {
    return next();
  }

  // Hash the password with cost factor of 12
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate and hash email verification token
UserSchema.methods.getEmailVerificationToken = function () {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Set expire time (e.g., 10 minutes)
  this.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return verificationToken; // Return the *unhashed* token to be sent via email
};

// Method to generate and hash password reset token
UserSchema.methods.getPasswordResetToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire time (e.g., 10 minutes)
  this.passwordResetExpire = Date.now() + 10 * 60 * 1000; // 10 mins

  return resetToken; // Return the *unhashed* token
};

module.exports = mongoose.model("User", UserSchema);
