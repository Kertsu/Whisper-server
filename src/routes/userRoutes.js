import express from "express";
import {
  getSelf,
  login,
  logout,
  register,
  resendOTP,
} from "../controllers/userController.js";
import { isAuthenticated, isVerifiedAndAuthenticated } from "../middlewares/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/@me", isVerifiedAndAuthenticated, getSelf);

userRouter.get("/logout", isAuthenticated, logout);

userRouter.post("/login", login);

userRouter.post("/register", register);

userRouter.post("/resend-otp", isAuthenticated, resendOTP);

export default userRouter;
