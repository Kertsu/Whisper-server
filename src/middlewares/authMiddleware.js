import { error } from "../utils/httpResponse.js";

export const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return error(res, null, "Not authenticated", 401);
  }

  return next();
};

export const isVerifiedAndAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return error(res, null, "Not authenticated", 401);
  }

  if (!req.user.emailVerifiedAt && !req.user.facebookId) {
    return error(res, null, "Email not verified", 403);
  }

  return next();
};
