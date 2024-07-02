import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import { generateInitiatorUsername } from "../utils/helpers.js";
import Conversation from "../models/conversationsModel.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

const getConversations = asyncHandler(async (req, res, next) => {});

const getMessages = asyncHandler(async (req, res, next) => {});

const sendMessage = asyncHandler(async (req, res, next) => {});

const updateMessage = asyncHandler(async (req, res, next) => {});

const markMessageAsRead = asyncHandler(async (req, res, next) => {});

const initiateConversation = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { content } = req.body;
  const recipient = await User.findOne({ username });

  if (!recipient) {
    return error(res, null, "User not found", 404);
  }

  if (!content) {
    return error(res, null, "Content is required", 400);
  }

  const existingConversation = await Conversation.findOne({
    initiator: req.user._id,
    recipient: recipient._id,
  });

  if (existingConversation) {
    return error(res, null, "Conversation already exists");
  }

  if (req.user._id === recipient._id) {
    return error(
      res,
      null,
      "Cannot initiate a conversation with yourself",
      400
    );
  }

  try {
    const initiatorUsername = await generateInitiatorUsername();

    const newConversation = await Conversation.create({
      initiator: req.user._id,
      recipient: recipient._id,
      initiatorUsername,
    });

    const message = await Message.create({
      sender: req.user._id,
      conversation: newConversation._id,
      content,
    });

    console.log(req.io);

    return success(res, { newConversation }, "Message sent");
  } catch (err) {
    return error(res, null, "Error sending message");
  }
});

export {
  getConversations,
  getMessages,
  sendMessage,
  updateMessage,
  markMessageAsRead,
  initiateConversation,
};
