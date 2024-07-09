import express from "express";
import {
  checkAuth,
  deleteSelf,
  getSelf,
  login,
  logout,
  onboard,
  register,
  resendVerificationLink,
  validateToken,
  validateUsername,
  verifyEmail,
} from "../controllers/userController.js";
import {
  isAuthenticated,
  isVerifiedAndAuthenticated,
} from "../middlewares/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/auth/check", checkAuth);

userRouter.get("/@me", isVerifiedAndAuthenticated, getSelf);

userRouter.post("/login", login);

userRouter.post("/register", register);

userRouter.post("/verify/resend", resendVerificationLink);

userRouter.post("/verify", verifyEmail);

userRouter.post("/validate/:username", isVerifiedAndAuthenticated, validateUsername );

userRouter.delete("/self/delete", isVerifiedAndAuthenticated, deleteSelf);

userRouter.get("/logout", isAuthenticated, logout);

userRouter.patch('/onboard', isVerifiedAndAuthenticated, onboard)

userRouter.post('/token/validate', validateToken)

export default userRouter;
