import express from "express";
import { getSelf, logout } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/@me", isAuthenticated, getSelf);
userRouter.get("/logout", isAuthenticated, logout);

export default userRouter;
