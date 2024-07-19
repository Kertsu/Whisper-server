import express from "express";
import {
  checkAuth,
  checkUsernameAvailability,
  deleteSelf,
  forgotPassword,
  getSelf,
  login,
  logout,
  onboard,
  register,
  resendVerificationLink,
  resetPassword,
  updatePassword,
  validateResetPasswordLink,
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

userRouter.post(
  "/validate/:username",
  isVerifiedAndAuthenticated,
  validateUsername
);

userRouter.delete("/self/delete", isVerifiedAndAuthenticated, deleteSelf);

userRouter.get("/logout", isAuthenticated, logout);

userRouter.patch("/onboard", isVerifiedAndAuthenticated, onboard);

userRouter.post("/token/validate", validateToken);

userRouter.post("/forgot_password", forgotPassword);

userRouter.route('/reset_password/:token/:id').get(validateResetPasswordLink).patch(resetPassword);

userRouter.patch('/update_password', isVerifiedAndAuthenticated, updatePassword)

userRouter.post('/check_username_availability', isVerifiedAndAuthenticated, checkUsernameAvailability)

export default userRouter;
