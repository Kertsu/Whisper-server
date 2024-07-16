import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import {
  buildConversationPipeline,
  generateInitiatorUsername,
} from "../utils/helpers.js";
import Conversation from "../models/conversationsModel.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";
import { getUserById } from "../utils/socketManager.js";

const getConversations = asyncHandler(async (req, res, next) => {
  const { first, rows } = req.query;

  const userId = req.user._id;

  const pipeline = buildConversationPipeline({
    $or: [{ initiator: userId }, { recipient: userId }],
  });

  if (first !== undefined && rows !== undefined) {
    pipeline.push({ $skip: parseInt(first) });
    pipeline.push({ $limit: parseInt(rows) });
  }

  try {
    const conversations = await Conversation.aggregate(pipeline).exec();
    const totalRecords = await Conversation.countDocuments({
      $or: [{ initiator: userId }, { recipient: userId }],
    });

    return success(
      res,
      { conversations, totalRecords },
      "Conversations fetched successfully"
    );
  } catch (err) {
    console.log(err);
    return error(res, null, "Error while fetching conversations");
  }
});

const getMessages = asyncHandler(async (req, res, next) => {
  const requestingUserId = req.user._id;
  const conversationId = req.params.conversationId;
  const { rows = 10, before } = req.query;

  const conversation = await Conversation.findById(conversationId);

  if (
    !conversation ||
    (!conversation.recipient.equals(requestingUserId) &&
      !conversation.initiator.equals(requestingUserId))
  ) {
    return error(res, null, "Conversation not found", 404);
  }

  const messagesQuery = Message.find({ conversation: conversationId }).sort({
    createdAt: -1,
  });

  if (before) {
    messagesQuery.where("createdAt").lt(new Date(before));
  }

  const messages = await messagesQuery.limit(parseInt(rows)).exec();

  if (messages.length === 0) {
    return success(res, { messages, olderMessages: 0 });
  }

  const olderMessages = await Message.countDocuments({
    conversation: conversationId,
    createdAt: { $lt: messages[messages.length - 1].createdAt },
  });

  const latestMessage = await Message.findOne({
    conversation: conversationId,
    sender: { $ne: requestingUserId },
    readAt: null,
  })
    .sort({ createdAt: -1 })
    .populate("conversation");

  if (latestMessage) {
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: latestMessage.sender,
        createdAt: { $lte: latestMessage.createdAt },
        readAt: null,
      },
      { readAt: new Date() }
    );

    const message = latestMessage;
    console.log(message);

    req.io.emit(`read.${conversation._id}`, { message });
  }

  return success(res, { messages, olderMessages });
});

const sendMessage = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const senderId = req.user._id;

  const conversation = await Conversation.findById(conversationId);

  if (
    !conversation ||
    (!conversation.recipient.equals(senderId) &&
      !conversation.initiator.equals(senderId))
  ) {
    return error(res, null, "Conversation not found", 404);
  }

  if (!content) {
    return error(res, null, "Content is required", 400);
  }

  const initiatorDeleted = await User.findById(conversation.initiator);
  const recipientDeleted = await User.findById(conversation.recipient);

  if (!initiatorDeleted || !recipientDeleted) {
    return error(res, null, "This person is unavailable on Whisper", 403);
  }

  const newMessage = await Message.create({
    sender: senderId,
    conversation: conversationId,
    content,
  });

  const message = await Message.findById(newMessage._id).populate(
    "conversation"
  );

  req.io.emit(`conversation.${conversation._id}`, { message });

  return success(res, { newMessage }, "Message sent successfully");
});

const updateMessage = asyncHandler(async (req, res, next) => {
  const content = req.body.content;
  const { messageId, conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return error(res, null, "Conversation not found", 404);
  }

  const message = await Message.findById(messageId);

  if (!message) {
    return error(res, null, "Message not found", 404);
  }

  if (!message.sender.equals(req.user._id)) {
    return error(res, null, "Invalid action", 403);
  }

  if (!content) {
    return error(res, null, "Content is required", 400);
  }

  message.content = content;
  await message.save();

  return success(res, { message }, "Message updated successfully");
});

const markMessageAsRead = asyncHandler(async (req, res, next) => {
  const { messageId, conversationId } = req.params;
  const requestingUserId = req.user._id;

  const conversation = await Conversation.findById(conversationId);

  if (
    !conversation ||
    (conversation.recipient.equals(requestingUserId) &&
      conversation.initiator.equals(requestingUserId))
  ) {
    return error(res, null, "Conversation not found", 404);
  }

  const message = await Message.findOne({
    _id: messageId,
    sender: { $ne: requestingUserId },
  }).populate("conversation");

  if (!message) {
    return error(res, null, "Message not found", 404);
  }

  const now = Date.now();

  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: requestingUserId },
      readAt: null,
      createdAt: { $lte: message.createdAt },
    },
    { readAt: now }
  );

  message.readAt = now;
  await message.save();

  req.io.emit(`read.${conversation._id}`, { message });

  return success(res, { message }, "Message marked as read");
});

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

  if (req.user._id.equals(recipient._id)) {
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

    await Message.create({
      sender: req.user._id,
      conversation: newConversation._id,
      content,
    });

    const pipeline = buildConversationPipeline({ _id: newConversation._id });

    const conversations = await Conversation.aggregate(pipeline).exec();

    let conversation = conversations[0];

    const receiver = getUserById(recipient._id);

    console.log(receiver);
    if (receiver) {
      req.io
        .to(receiver.socketId)
        .emit(`receive.${receiver._id}`, { conversation });
    }

    return success(res, { newConversation }, "Message sent");
  } catch (err) {
    return error(res, null, "Error sending message");
  }
});

const getConversation = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId;
  const requestingUserId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [
      {
        initiator: requestingUserId,
      },
      {
        recipient: requestingUserId,
      },
    ],
  }).populate("recipient");
  if (!conversation) {
    return error(res, null, "Conversation not found", 404);
  }

  return success(res, { conversation });
});

export {
  getConversations,
  getMessages,
  sendMessage,
  updateMessage,
  markMessageAsRead,
  initiateConversation,
  getConversation,
};
