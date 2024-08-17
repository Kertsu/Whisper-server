import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import Report from "../models/report.model.js";

export const createReport = asyncHandler(async (req, res) => {
  const { reportType, conversationId, defendantId } = req.body;

  if (!defendantId) {
    return error(res, null, "Defendant not found", 404);
  }

  if (!reportType) {
    return error(res, null, "Type not provided", 400);
  }

  if (!conversationId) {
    return error(res, null, "Conversation not provided", 400);
  }

  if (defendantId == req.user._id) {
    return error(res, null, "Cannot report yourself", 403);
  }

  try {
    const report = await Report.create({
      plaintiff: req.user._id,
      defendant: defendantId,
      reportType,
      conversation: conversationId,
    });

    return success(res, { report }, "Report submitted");
  } catch (err) {
    error(res, null, "Error creating report", 500);
  }
});
