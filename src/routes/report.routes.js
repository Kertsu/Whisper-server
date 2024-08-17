import express from "express";
import { isVerifiedAndAuthenticated } from "../middlewares/auth.middleware.js";
import { createReport } from "../controllers/report.controller.js";

const reportRouter = express.Router();

reportRouter.post("/", isVerifiedAndAuthenticated, createReport);

export default reportRouter;
