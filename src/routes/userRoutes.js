import express from "express";
import { getSelf } from "../controllers/userController.js";

const userRouter = express.Router()

userRouter.get('/@me', getSelf)

export default userRouter