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

  const user = await User.findOne({
    $or: [{ username }, { email }],
    password: {$exists: true}
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
    return success(res, { user });
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

    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      return success(res, { user: newUser }, "User created successfully");
    });
  } catch (error) {
    return error(res, null, "Internal Server Error", 500);
  }
});

export { getSelf, logout, login, register };
