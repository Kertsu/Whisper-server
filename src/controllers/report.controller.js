import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import Report from "../models/report.model.js";
import Conversation from "../models/conversation.model.js";

export const createReport = asyncHandler(async (req, res) => {
  const { reportType, conversationId } = req.body;
  const requestingUserId = req.user._id;

  if (!conversationId) {
    return error(res, null, "Conversation not provided", 400);
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return error(res, null, "Conversation not found", 404);
  }

  const defendantId = conversation.initiator.equals(requestingUserId)
    ? conversation.recipient
    : conversation.initiator;

  if (!reportType) {
    return error(res, null, "Type not provided", 400);
  }

  try {
    const report = await Report.create({
      plaintiff: requestingUserId,
      defendant: defendantId,
      reportType,
      conversation: conversationId,
    });

    return success(res, { report }, "Report submitted");
  } catch (err) {
    error(res, null, "Error creating report", 500);
  }
});
