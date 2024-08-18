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
  refreshAccessToken,
  register,
  removeProfilePicture,
  resendVerificationLink,
  resetPassword,
  updatePassword,
  updateUsername,
  uploadProfilePicture,
  validateResetPasswordLink,
  validateToken,
  validateUsername,
  verifyEmail,
} from "../controllers/user.controller.js";
import {
  isAuthenticated,
  isVerifiedAndAuthenticated,
} from "../middlewares/auth.middleware.js";
import upload from "../../config/multer.js";

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

userRouter.delete("/@me/delete", isVerifiedAndAuthenticated, deleteSelf);

userRouter.post("/logout", isVerifiedAndAuthenticated, logout);

userRouter.patch("/onboard", isVerifiedAndAuthenticated, onboard);

userRouter.post("/token/validate", validateToken);

userRouter.post("/forgot_password", forgotPassword);

userRouter
  .route("/reset_password/:token/:id")
  .get(validateResetPasswordLink)
  .patch(resetPassword);

userRouter.patch(
  "/@me/update_password",
  isVerifiedAndAuthenticated,
  updatePassword
);

userRouter.post(
  "/check_username_availability",
  isVerifiedAndAuthenticated,
  checkUsernameAvailability
);

userRouter.patch(
  "/@me/update_username",
  isVerifiedAndAuthenticated,
  updateUsername
);

userRouter.post(
  "/@me/upload_profile_picture",
  upload.single("avatar"),
  isVerifiedAndAuthenticated,
  uploadProfilePicture
);

userRouter.delete(
  "/@me/remove_profile_picture",
  isVerifiedAndAuthenticated,
  removeProfilePicture
);

userRouter.post(
  "/@me/refresh_access_token",
  refreshAccessToken
);

export default userRouter;
