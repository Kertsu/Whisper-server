import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/authMiddleware.js";
import { subscribeToPushNotifications } from "../controllers/subscriptionController.js";

const subscriptionRouter = express.Router();

subscriptionRouter.post(
  "/subscribe",
  isVerifiedAndAuthenticated,
  subscribeToPushNotifications
);

export default subscriptionRouter;
