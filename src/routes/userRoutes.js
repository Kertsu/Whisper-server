import express from "express";
import {
  deleteSelf,
  getSelf,
  login,
  logout,
  register,
  resendOTP,
  validateUsername,
  verifyOTP,
} from "../controllers/userController.js";
import {
  isAuthenticated,
  isVerifiedAndAuthenticated,
} from "../middlewares/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/@me", isVerifiedAndAuthenticated, getSelf);

userRouter.get("/logout", isAuthenticated, logout);

userRouter.post("/login", login);

userRouter.post("/register", register);

userRouter.post("/resend-otp", isAuthenticated, resendOTP);

userRouter.post("/verify", isAuthenticated, verifyOTP);

userRouter.delete("/delete", isVerifiedAndAuthenticated, deleteSelf);

userRouter.post(
  "/validate/:username",
  isVerifiedAndAuthenticated,
  validateUsername
);

export default userRouter;
