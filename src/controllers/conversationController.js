import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import Conversation from "../models/conversationsModel.js";

const getConversations = asyncHandler(async (req, res, next) => {});

const getMessages = asyncHandler(async (req, res, next) => {});

const sendMessage = asyncHandler(async (req, res, next) => {});

const updateMessage = asyncHandler(async (req, res, next) => {});

const markMessageAsRead = asyncHandler(async (req, res, next) => {});

export { getConversations, getMessages, sendMessage, updateMessage, markMessageAsRead };
