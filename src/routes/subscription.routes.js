import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/auth.middleware.js";
import { subscribeToPushNotifications, unsubscribeToPushNotifications } from "../controllers/subscription.controller.js";

const subscriptionRouter = express.Router();

subscriptionRouter.post(
  "/subscribe",
  isVerifiedAndAuthenticated,
  subscribeToPushNotifications
);

subscriptionRouter.post(
  "/unsubscribe",
  unsubscribeToPushNotifications
);

export default subscriptionRouter;
