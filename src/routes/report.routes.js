import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/auth.middleware.js";
import { createReport } from "../controllers/report.controller.js";

const reportRouter = express.Router();

reportRouter.post("/:defendantId", isVerifiedAndAuthenticated, createReport);

export default reportRouter;
