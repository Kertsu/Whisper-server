import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/auth.middleware.js";
import {
  reactivateSubscription,
  subscribeToPushNotifications,
  unsubscribeToPushNotifications,
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

subscriptionRouter.post("/unsubscribe", unsubscribeToPushNotifications);

export default subscriptionRouter;
