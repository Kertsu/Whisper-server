import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import { User } from "../models/index.models.js";

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

    return success(res, { user }, "Subscription saved.");
  } catch (err) {
    console.error("Error saving subscription:", err);
    return error(res, null, "Failed to save subscription");
  }
});
