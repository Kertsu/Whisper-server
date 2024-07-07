import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import User from "../models/userModel.js";
import { sendVerificationLink } from "../utils/mailer.js";
import { generateToken } from "../utils/helpers.js";
import jwt from 'jsonwebtoken'

const getSelf = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return error(res, null, "User not found", 404);
    }

    return success(res, { user });
  } catch (error) {
    next(error);
  }
});

/**
 * @todo revoke token
 */
const logout = asyncHandler(async (req, res, next) => {
  return success(res, null, "Logged out successfully");
});

/**
 * @todo revoke token
 */
const deleteSelf = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return error(res, null, "User not found", 404);
    }

    await user.deleteOne();

    return success(res, null, "Account deleted successfully");
  } catch (error) {
    return error(res, error, "Failed to delete user", 500);
  }
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    email,
    password: { $exists: true },
  });

  if (!user) {
    return error(res, null, "Sorry, we couldn't find your account.", 404);
  }

  if (!(await user.matchPassword(password))) {
    return error(res, null, "Invalid credentials", 401);
  }

  const userData = {
    ...user.toObject(),
    token: generateToken(user._id, { expiresIn: "1d" }),
  };

  return success(res, {
    user: userData,
    otp: user.emailVerifiedAt ? false : true,
  });
});

const register = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user) {
    return error(res, null, "Email already in use.", 409);
  }

  try {
    const username = email.split("@")[0];
    const newUser = await User.create({
      email,
      username,
      password,
    });

    const token = generateToken(newUser._id, {expiresIn: '1hr'})

    sendVerificationLink({ email, name: username, token });

    return success(res, { user: newUser }, "Please verify your email");
  } catch (error) {
    return error(res, null, "Internal Server Error", 500);
  }
});

const resendOTP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(400).json({
      success: false,
      error: "User not found",
    });
  }

  if (user.emailVerifiedAt) {
    return error(res, null, "Email already verified", 409);
  }

  sendOTP({ email: user.email, name: user.username });

  return success(
    res,
    null,
    "OTP has been sent successfully. Please check your email for the code."
  );
});

const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.body;
 
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return error(res, null, 'Invalid token', 400);
    }

    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    user.emailVerifiedAt = new Date();
    await user.save()

    return success(res, { token: newToken, user }, 'Email verified and user logged in');
  } catch (err) {
    console.error(err);
    return error(res, null, 'Invalid or expired token', 400);
  }
});

const validateUsername = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const user = await User.findOne({ username }).select("_id username avatar");

  if (!user) {
    return error(
      res,
      null,
      "Sorry, we couldn't find the user you were looking for",
      404
    );
  }

  return success(res, { user });
});

const checkAuth = asyncHandler(async (req, res, next) => {
  res.json({
    isAuthenticated: req.user ? true : false,
  });
});

export {
  getSelf,
  logout,
  login,
  register,
  resendOTP,
  verifyEmail,
  deleteSelf,
  validateUsername,
  checkAuth,
};
