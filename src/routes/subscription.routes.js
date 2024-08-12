import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/auth.middleware.js";
import { subscribeToPushNotifications } from "../controllers/subscription.controller.js";

const subscriptionRouter = express.Router();

subscriptionRouter.post(
  "/subscribe",
  isVerifiedAndAuthenticated,
  subscribeToPushNotifications
);

export default subscriptionRouter;
