import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import User from "../models/userModel.js";

export const getSelf = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      error(res, null, "User not found", 404);
    }

    success(res, { user });
  } catch (error) {
    next(error);
  }
});

export const logout = asyncHandler(async(req, res, next) => {
  console.log('3grd')
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('connect.sid'); 
      res.redirect('http://localhost:4200');
    });
  });
}) 
