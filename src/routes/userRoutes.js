import express from "express";
import { getSelf, login, logout } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/@me", isAuthenticated, getSelf);

userRouter.get("/logout", isAuthenticated, logout);

userRouter.post("/login", login)

export default userRouter;
