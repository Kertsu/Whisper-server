import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/auth.middleware.js";
import {
  blockConversation,
  getConversation,
  getConversations,
  getMessages,
  initiateConversation,
  markMessageAsRead,
  sendMessage,
  unblockConversation,
  updateMessage,
} from "../controllers/conversation.controller.js";

const conversationRouter = express.Router();

conversationRouter.post(
  "/initiate/:username",
  isVerifiedAndAuthenticated,
  initiateConversation
);

conversationRouter.get("/", isVerifiedAndAuthenticated, getConversations);

conversationRouter.post(
  "/:conversationId/messages/send",
  isVerifiedAndAuthenticated,
  sendMessage
);

conversationRouter.get(
  "/:conversationId/messages",
  isVerifiedAndAuthenticated,
  getMessages
);

conversationRouter.patch(
  "/:conversationId/messages/:messageId",
  isVerifiedAndAuthenticated,
  updateMessage
);

conversationRouter.patch(
  "/:conversationId/messages/:messageId/read",
  isVerifiedAndAuthenticated,
  markMessageAsRead
);

conversationRouter.get(
  "/:conversationId",
  isVerifiedAndAuthenticated,
  getConversation
);

conversationRouter.patch(
  "/:conversationId/block",
  isVerifiedAndAuthenticated,
  blockConversation
);

conversationRouter.patch(
  "/:conversationId/unblock",
  isVerifiedAndAuthenticated,
  unblockConversation
);

export default conversationRouter;
