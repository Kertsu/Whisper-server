import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import {
  buildConversationPipeline,
  createConversationPromises,
  generateInitiatorUsername,
  sendPushNotification,
} from "../utils/helpers.js";
import { Conversation, User, Message } from "../models/index.models.js";
import { getUserById } from "../utils/socketManager.js";

const initiatorAvatarTransformations = [
  {
    effect: "pixelate:300",
    quality: "1",
    fetch_format: "auto",
    angle: 90,
  },
];

const getConversations = asyncHandler(async (req, res) => {
  const { first = 0, rows = 10 } = req.query;
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

    const conversationPromises = await createConversationPromises(
      conversations,
      initiatorAvatarTransformations
    );

    const updatedConversations = await Promise.all(conversationPromises);

    const hasMore = updatedConversations.length == parseInt(rows);

    return success(
      res,
      { conversations: updatedConversations, hasMore },
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
  const { rows = 10, before, preview = false } = req.query;

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

  if (!preview) {
    const latestMessage = await Message.findOneAndUpdate(
      {
        conversation: conversationId,
        sender: { $ne: requestingUserId },
        readAt: null,
      },
      { readAt: new Date() },
      { new: true }
    )
      .sort({ createdAt: -1 })
      .populate("conversation");

    if (latestMessage) {
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: latestMessage.sender,
          createdAt: { $lt: latestMessage.createdAt },
          readAt: null,
        },
        { readAt: new Date() }
      );

      const message = latestMessage;

      req.io.emit(`read.${conversation._id}`, { message });
    }
  }

  return success(res, { messages, olderMessages });
});

const sendMessage = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const senderId = req.user._id;

  const initiatorAvatarTransformations = [
    {
      effect: "pixelate:20",
      fetch_format: "auto",
      angle: 90,
      width: 72,
      height: 72,
      crop: "fill",
      quality: "auto:low",
    },
  ];

  const recipientAvatarTransformations = [
    {
      width: 72,
      height: 72,
      crop: "fill",
      quality: "auto:low",
      fetch_format: "auto",
    },
  ];

  const pipeline = buildConversationPipeline({
    _id: new mongoose.Types.ObjectId(conversationId),
  });
  const conversations = await Conversation.aggregate(pipeline).exec();

  const conversationPromises = await createConversationPromises(
    conversations,
    initiatorAvatarTransformations,
    recipientAvatarTransformations
  );

  const updatedConversations = await Promise.all(conversationPromises);
  const conversation = updatedConversations[0];

  if (
    !conversation ||
    (!conversation.recipient.equals(senderId) &&
      !conversation.initiator.equals(senderId))
  ) {
    return error(res, null, "Conversation not found", 404);
  }

  if (
    (conversation.initiator.equals(senderId) &&
      conversation.blockedByInitiator) ||
    (conversation.recipient.equals(senderId) &&
      conversation.blockedByRecipient) ||
    (conversation.initiator.equals(senderId) &&
      conversation.blockedByRecipient) ||
    (conversation.recipient.equals(senderId) && conversation.blockedByInitiator)
  ) {
    return error(
      res,
      null,
      "You cannot send messages in this conversation",
      400
    );
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
    status: "sent",
  });

  const message = await Message.findById(newMessage._id).populate(
    "conversation"
  );

  const recipientId = conversation.initiator._id.equals(senderId)
    ? conversation.recipient._id
    : conversation.initiator._id;
  const recipientFromSocketList = getUserById(recipientId);

  if (recipientFromSocketList) {
    req.io
      .to(recipientFromSocketList.socketId)
      .emit(`conversation.${conversation._id}`, { message });
  }
  await sendPushNotification(recipientId, message, conversation, 'existing');

  return success(res, { message }, "Message sent successfully");
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

  const initiatorAvatarTransformations = [
    {
      effect: "pixelate:20",
      fetch_format: "auto",
      angle: 90,
      width: 72,
      height: 72,
      crop: "fill",
      quality: "auto:low",
    },
  ];

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

    const newMessage = await Message.create({
      sender: req.user._id,
      conversation: newConversation._id,
      content,
    });

    const pipeline = buildConversationPipeline({ _id: newConversation._id });

    const conversations = await Conversation.aggregate(pipeline).exec();

    const conversationPromises = await createConversationPromises(
      conversations,
      initiatorAvatarTransformations
    );
    const updatedConversations = await Promise.all(conversationPromises);

    let conversation = updatedConversations[0];

    const receiver = getUserById(recipient._id);

    if (receiver) {
      req.io
        .to(receiver.socketId)
        .emit(`receive.${receiver._id}`, { conversation });
    }

    await sendPushNotification(recipient._id, newMessage, conversation);

    return success(res, { newConversation }, "Message sent");
  } catch (err) {
    return error(res, null, "Error sending message");
  }
});

const getConversation = asyncHandler(async (req, res) => {
  const conversationId = req.params.conversationId;
  const requestingUserId = req.user._id;

  const matchCondition = {
    _id: new mongoose.Types.ObjectId(conversationId),
    $or: [
      {
        initiator: requestingUserId,
      },
      {
        recipient: requestingUserId,
      },
    ],
  };

  const conversation = await Conversation.findOne(matchCondition);

  if (!conversation) {
    return error(res, null, "Conversation not found", 404);
  }

  const pipeline = buildConversationPipeline(matchCondition);

  const conversations = await Conversation.aggregate(pipeline).exec();
  const conversationPromises = await createConversationPromises(
    conversations,
    initiatorAvatarTransformations
  );
  const updatedConversations = await Promise.all(conversationPromises);

  return success(res, { conversations: updatedConversations });
});

const blockConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const requestingUserId = req.user._id;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return error(res, null, "Conversation not found", 404);
  }

  const isInitiator = conversation.initiator.equals(requestingUserId);
  const isRecipient = conversation.recipient.equals(requestingUserId);

  if (!isInitiator && !isRecipient) {
    return error(res, null, "Not authorized to block this conversation", 403);
  }

  let wasBlocked = false;

  if (isInitiator) {
    if (!conversation.blockedByInitiator) {
      conversation.blockedByInitiator = true;
      wasBlocked = true;
    }
  } else if (isRecipient) {
    if (!conversation.blockedByRecipient) {
      conversation.blockedByRecipient = true;
      wasBlocked = true;
    }
  }

  if (wasBlocked) {
    await conversation.save();
  } else {
    return success(res, null, "Conversation already blocked", 200);
  }

  const matchCondition = { _id: new mongoose.Types.ObjectId(conversationId) };

  const pipeline = buildConversationPipeline(matchCondition);

  const conversations = await Conversation.aggregate(pipeline).exec();
  const conversationPromises = await createConversationPromises(
    conversations,
    initiatorAvatarTransformations
  );
  const updatedConversations = await Promise.all(conversationPromises);

  return success(
    res,
    { conversations: updatedConversations },
    "Conversation blocked successfully"
  );
});

const unblockConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const requestingUserId = req.user._id;

  const conversation = await Conversation.findById(conversationId);

  if (
    !conversation ||
    (!conversation.initiator.equals(requestingUserId) &&
      !conversation.recipient.equals(requestingUserId))
  ) {
    return error(res, null, "Conversation not found", 404);
  }

  const isInitiator = conversation.initiator.equals(requestingUserId);
  const isRecipient = conversation.recipient.equals(requestingUserId);

  if (!isInitiator && !isRecipient) {
    return error(res, null, "Not authorized to unblock this conversation", 403);
  }

  let wasUnblocked = false;

  if (isInitiator && conversation.blockedByInitiator) {
    conversation.blockedByInitiator = false;
    wasUnblocked = true;
  } else if (isRecipient && conversation.blockedByRecipient) {
    conversation.blockedByRecipient = false;
    wasUnblocked = true;
  }

  if (wasUnblocked) {
    await conversation.save();
  } else {
    return success(res, null, "Conversation already unblocked", 200);
  }

  const matchCondition = { _id: new mongoose.Types.ObjectId(conversationId) };
  const pipeline = buildConversationPipeline(matchCondition);

  const conversations = await Conversation.aggregate(pipeline).exec();
  const conversationPromises = await createConversationPromises(
    conversations,
    initiatorAvatarTransformations
  );
  const updatedConversations = await Promise.all(conversationPromises);

  return success(
    res,
    { conversations: updatedConversations },
    "Conversation unblocked successfully"
  );
});

export {
  getConversations,
  getMessages,
  sendMessage,
  updateMessage,
  markMessageAsRead,
  initiateConversation,
  getConversation,
  blockConversation,
  unblockConversation,
};
