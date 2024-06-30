import { error } from "../utils/httpResponse.js";

export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  error(res, null, "Not authenticated", 401);
};
