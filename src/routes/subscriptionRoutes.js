import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/authMiddleware.js";
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from "../controllers/subscriptionController.js";

const subscriptionRouter = express.Router();

subscriptionRouter.post("/subscribe", isVerifiedAndAuthenticated, subscribeToPushNotifications);
subscriptionRouter.post("/unsubscribe", isVerifiedAndAuthenticated, unsubscribeFromPushNotifications);


export default subscriptionRouter