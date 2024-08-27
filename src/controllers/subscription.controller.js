import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import { User } from "../models/index.models.js";
import { base64Encode } from "../utils/helpers.js";

export const subscribeToPushNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const subscription = req.body.subscription;

  try {
    const subscriptionExist = await User.findOne({
      pushNotificationSubscriptions: {
        $elemMatch: { endpoint: subscription.endpoint },
      },
    });

    if (subscriptionExist) {
      return success(res, null, "Subscription already exists", 200);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { pushNotificationSubscriptions: subscription } },
      { new: true }
    );

    user.avatar = await base64Encode(user.avatar);

    return success(res, { user }, "Subscription saved.");
  } catch (err) {
    console.error("Error saving subscription:", err);
    return error(res, null, "Failed to save subscription");
  }
});

export const unsubscribeFromPushNotifications = asyncHandler(async (req, res) => {
  const subscription = req.body.subscription;

  if (!subscription || !subscription.endpoint) {
    return error(res, null, "Invalid subscription data", 400);
  }

  try {
    const result = await User.findOneAndUpdate(
      { "pushNotificationSubscriptions.endpoint": subscription.endpoint },
      { $set: { "pushNotificationSubscriptions.$.active": false } },
      { new: true }
    );
    

    if (!result) {
      return error(res, null, "Subscription not found", 404);
    }

    return success(res, null, "Subscription removed.");
  } catch (err) {
    console.error("Error removing subscription:", err);
    return error(res, null, "Failed to remove subscription");
  }
});

export const reactivateSubscription = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { subscription } = req.body;
  const endpoint = subscription ? subscription.endpoint : null;

  try {
    const user = await User.findOneAndUpdate(
      { _id: userId, "pushNotificationSubscriptions.endpoint": endpoint },
      { $set: { "pushNotificationSubscriptions.$.active": true } },
      { new: true }
    );
    user.avatar = await base64Encode(user.avatar);

    return success(res, { user }, "Subscription reactivated successfully.");
  } catch (err) {
    console.error("Error reactivating subscription:", err);
    return error(res, null, "Failed to reactivate subscription.");
  }
});
