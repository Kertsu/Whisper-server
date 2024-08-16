import asyncHandler from "express-async-handler";

export const createReport = asyncHandler(async (req, res) => {
  const { defendantId } = req.params;
  const { type } = req.body;
});
