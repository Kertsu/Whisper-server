import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import { error, success } from "../utils/httpResponse.js";
import User from "../models/userModel.js";
import { sendOTP } from "../utils/mailer.js";
import { generateToken } from "../utils/helpers.js";

const destroySession = (req, res, next, message = null) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie("connect.sid", { path: "/" });
      return success(res, null, message);
    });
  });
};

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

const logout = asyncHandler(async (req, res, next) => {
  destroySession(req, res, next, "Logged out");
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

    sendOTP({ email, name: username });

    return success(res, { user: newUser }, "OTP sent to your email");
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

const verifyOTP = asyncHandler(async (req, res, next) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return error(res, null, "User not found", 404);
  }

  if (user.emailVerifiedAt) {
    return error(res, null, "Email already verified", 409);
  }

  if (await bcrypt.compare(otp, user.verification.code)) {
    if (user.verification.expiresAt < Date.now()) {
      return error(res, null, "OTP expired", 401);
    }

    user.emailVerifiedAt = Date.now();
    user.verification = undefined;

    await user.save();
    return success(res, { user }, "Email verified successfully");
  } else {
    return error(res, null, "Invalid OTP", 401);
  }
});

const deleteSelf = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return error(res, null, "User not found", 404);
    }

    await user.deleteOne();

    destroySession(req, res, next, "User deleted successfully");
  } catch (error) {
    return error(res, error, "Failed to delete user", 500);
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
    isAuthenticated: true,
  });
});

export {
  getSelf,
  logout,
  login,
  register,
  resendOTP,
  verifyOTP,
  deleteSelf,
  validateUsername,
  checkAuth,
};
