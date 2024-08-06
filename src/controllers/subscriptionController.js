import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import User from "../models/userModel.js";

export const subscribeToPushNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const subscription = req.body.subscription;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: { pushNotificationSubscriptions: subscription },
      },
      { new: true }
    );
    return success(res, { user }, "Subscription saved.");
  } catch (err) {
    console.log(err, 'ln20')
    return error(res, null, "Failed to save subscription");
  }
});

export const unsubscribeFromPushNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const endpoint = req.body.endpoint;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { pushNotificationSubscriptions: { endpoint } }
      },
      { new: true }
    );
    return success(res, { user }, "Subscription removed.");
  } catch (err) {
    return error(res, null, "Failed to remove subscription");
  }
});
