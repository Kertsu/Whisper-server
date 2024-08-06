import crypto from "crypto";
import Conversation from "../models/conversationsModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import cloudinary from "../../config/cloudinary.js";
import axios from "axios";
import webPush from "../../config/webPush.js";

const generateRandomString = (length) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < bytes.length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
};

export const generateInitiatorUsername = async () => {
  let randomUsername;
  do {
    randomUsername = "Whisp_" + generateRandomString(8);
  } while (await Conversation.findOne({ initiatorUsername: randomUsername }));

  return randomUsername;
};

export const generateRandomUsername = async (length) => {
  let randomUsername;
  do {
    randomUsername = "User_" + generateRandomString(length);
  } while (await User.findOne({ username: randomUsername }));

  return randomUsername;
};

export const buildConversationPipeline = (matchCondition) => {
  return [
    {
      $match: matchCondition,
    },
    {
      $lookup: {
        from: "messages",
        let: { conversationId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$conversation", "$$conversationId"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "latestMessage",
      },
    },
    { $unwind: { path: "$latestMessage", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "recipient",
        foreignField: "_id",
        as: "recipient",
      },
    },
    { $unwind: "$recipient" },
    {
      $project: {
        _id: 1,
        initiator: 1,
        recipient: { _id: 1, username: 1, avatar: 1 },
        initiatorUsername: 1,
        blockedByRecipient: 1,
        blockedByInitiator: 1,
        latestMessage: {
          _id: 1,
          conversation: 1,
          sender: 1,
          content: 1,
          readAt: 1,
          createdAt: 1,
          updatedAt: 1,
          status: 1,
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { "latestMessage.createdAt": -1 } },
  ];
};

export const generateToken = (id, options) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, options);
};

export const hasher = async (anything) => {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(anything, salt);

  return hashed;
};

export const compareHash = async (input, value) => {
  return await bcrypt.compare(input, value);
};

export const isValidPassword = (password) => {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(
    password
  );
};

export const base64Encode = async (publicId) => {
  const imageUrl = cloudinary.url(publicId, { secure: true });

  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    return `data:image/jpeg;base64,${Buffer.from(response.data).toString(
      "base64"
    )}`;
  } catch (e) {
    console.error("Error fetching image data:", e);
    return null;
  }
};

export const createConversationPromises = async (conversations) => {
  const populatedConversations = await Conversation.populate(conversations, [
    { path: "initiator", select: "avatar createdAt updatedAt" },
    { path: "recipient", select: "avatar createdAt updatedAt username" },
  ]);

  const conversationPromises = populatedConversations.map(
    async (conversation) => {
      const updatedConversation = { ...conversation };

      if (conversation.initiator && conversation.initiator.avatar) {
        const initiatorImageUrl = cloudinary.url(
          conversation.initiator.avatar,
          {
            transformation: [
              { effect: "pixelate:200" },
              { quality: "1" },
              { fetch_format: "auto" },
              { angle: 90 },
            ],
            secure: true,
          }
        );

        try {
          const initiatorResponse = await axios.get(initiatorImageUrl, {
            responseType: "arraybuffer",
          });
          updatedConversation.initiatorAvatar = `data:image/jpeg;base64,${Buffer.from(
            initiatorResponse.data
          ).toString("base64")}`;
        } catch (err) {
          console.error(err);
          updatedConversation.initiatorAvatar = null;
        }
      } else {
        updatedConversation.initiatorAvatar = null;
      }

      if (conversation.recipient && conversation.recipient.avatar) {
        const recipientImageUrl = cloudinary.url(
          conversation.recipient.avatar,
          {
            secure: true,
          }
        );

        try {
          const recipientResponse = await axios.get(recipientImageUrl, {
            responseType: "arraybuffer",
          });
          updatedConversation.recipientAvatar = `data:image/jpeg;base64,${Buffer.from(
            recipientResponse.data
          ).toString("base64")}`;
        } catch (err) {
          console.error(err);
          updatedConversation.recipientAvatar = null;
        }
      } else {
        updatedConversation.recipientAvatar = null;
      }

      return updatedConversation;
    }
  );

  return conversationPromises;
};

export const sendPushNotification = async (userId, message, sender) => {
  const user = await User.findById(userId);

  if (user && user.pushNotificationSubscriptions) {
    const payload = {
      notification: {
        title: "New Message",
        body: `${sender}: ${message.content}`,
        data: {
          actions: [{ action: "focus", title: "Focus Last" }],
          onActionClick: {
            default: {
              operation: "openWindow",
              url: `${process.env.APP_URL}/whisper/whisps/${message.conversation._id}`,
            },
            focus: {
              operation: "focusLastFocusedOrOpen",
              url: `relative/path`,
            },
          },
        },
        icon: "assets/icons/manifest-icon-512.maskable.png",
      },
    };

    let promises = [];

    user.pushNotificationSubscriptions.forEach((subscription) => {
      promises.push(
        webPush.sendNotification(subscription, JSON.stringify(payload))
      );
    });
    await Promise.all(promises)
      .then(() => {
        console.log("Push notifications sent successfully.");
      })
      .catch((error) => {
        console.error("Error sending push notifications:", error);
      });
  }
};
