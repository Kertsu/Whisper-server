import express from "express";
import {
  checkAuth,
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

userRouter.get("/auth/check", checkAuth);

userRouter.get("/@me", isVerifiedAndAuthenticated, getSelf);

userRouter.get("/logout", isAuthenticated, logout);

userRouter.post("/login", login);

userRouter.post("/register", register);

userRouter.post("/resend-otp", isAuthenticated, resendOTP);

userRouter.post("/verify", isAuthenticated, verifyOTP);

userRouter.delete("/self/delete", isVerifiedAndAuthenticated, deleteSelf);

userRouter.post(
  "/validate/:username",
  isVerifiedAndAuthenticated,
  validateUsername
);

export default userRouter;
