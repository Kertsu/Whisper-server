import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import User from "../models/userModel.js";
import { sendOTP } from "../utils/mailer.js";

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
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie("connect.sid");
      res.redirect("http://localhost:4200");
    });
  });
});

const login = asyncHandler(async (req, res, next) => {
  const { email, username, password } = req.body;
  console.log(req.body);

  const user = await User.findOne({
    $or: [{ username }, { email }],
    password: { $exists: true },
  });

  if (!user) {
    return error(res, null, "Sorry, we couldn't find your account.", 404);
  }

  if (!(await user.matchPassword(password))) {
    return error(res, null, "Invalid credentials", 401);
  }

  req.login(user, (err) => {
    if (err) {
      return next(err);
    }
    return success(res, { user, otp: user.emailVerifiedAt ? false : true });
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

    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      return success(res, { user: newUser }, "OTP sent to your email");
    });
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

  sendOTP({ email: user.email, name: user.username });

  return success(
    res,
    null,
    "OTP has been sent successfully. Please check your email for the code."
  );
});

export { getSelf, logout, login, register, resendOTP };
