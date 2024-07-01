import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import User from "../models/userModel.js";

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

  const andCondition = [
    { facebookId: { $exists: false } },
    { googleId: { $exists: false } },
  ];

  const userByUsername = await User.findOne({
    username,
    ...andCondition,
  });
  const userByEmail = await User.findOne({
    email,
    ...andCondition,
  });

  const user = userByEmail || userByUsername;

  if (!user) {
    return error(res, null, "User does not exist", 404);
  }

  if (!user.matchPassword(password)) {
    return error(res, null, "Invalid credentials", 401);
  }

  req.login(user, (err) => {
    if (err) {
      return next(err);
    }
    return success(res, { user });
  });
});

export { getSelf, logout, login };
