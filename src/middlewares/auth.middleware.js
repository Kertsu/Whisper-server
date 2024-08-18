import { error } from "../utils/httpResponse.js";
import jwt from "jsonwebtoken";
import { User } from "../models/index.models.js";

export const isAuthenticated = async (req, res, next) => {
  await checkAuth(req, res, next);
};

export const isVerifiedAndAuthenticated = async (req, res, next) => {
  await checkAuth(req, res, next, () => {
    if (!req.user.emailVerifiedAt && !req.user.facebookId) {
      return error(res, null, "Email not yet verified", 401);
    }
  });
};

const checkAuth = async (req, res, next, callback = null) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (callback) {
        callback();
      }

      if (!res.headersSent) {
        return next();
      }
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return error(res, null, "Access token expired", 401);
      }
      if (!res.headersSent) {
        return error(res, null, "Token invalid. Please log in again.", 401);
      }
    }
  }

  if (!token) {
    if (!res.headersSent) {
      return error(res, null, "Token does not exist", 401);
    }
  }
};
