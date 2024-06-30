import express from "express";
import { getSelf } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const userRouter = express.Router()

userRouter.get('/@me',isAuthenticated, getSelf)

export default userRouter