import express from "express";
import {
  getSelf,
  login,
  logout,
  register,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/@me", isAuthenticated, getSelf);

userRouter.get("/logout", isAuthenticated, logout);

userRouter.post("/login", login);

userRouter.post("/register", register);

export default userRouter;
