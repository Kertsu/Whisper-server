import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/auth.middleware.js";
import {
  reactivateSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../controllers/subscription.controller.js";

const subscriptionRouter = express.Router();

subscriptionRouter.post(
  "/subscribe",
  isVerifiedAndAuthenticated,
  subscribeToPushNotifications
);

subscriptionRouter.post(
  "/reactivate",
  isVerifiedAndAuthenticated,
  reactivateSubscription
);

subscriptionRouter.post("/unsubscribe", unsubscribeFromPushNotifications);

export default subscriptionRouter;
