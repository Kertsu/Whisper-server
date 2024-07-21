import asyncHandler from "express-async-handler";
import { error, success } from "../utils/httpResponse.js";
import User from "../models/userModel.js";
import {
  sendPasswordResetSuccess,
  sendResetPasswordLink,
  sendVerificationLink,
} from "../utils/mailer.js";
import { compareHash, generateToken, hasher } from "../utils/helpers.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import cloudinary from "../../config/cloudinary.js";

const getSelf = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return error(res, null, "User not found", 404);
    }

    return success(res, { user });
  } catch (error) {
    next(error);
  }
});

/**
 * @todo revoke token
 */
const logout = asyncHandler(async (req, res, next) => {
  return success(res, null, "Logged out successfully");
});

/**
 * @todo revoke token
 */
const deleteSelf = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return error(res, null, "User not found", 404);
    }

    await User.findOneAndDelete({ _id: req.user._id });

    return success(res, null, "Account deleted successfully");
  } catch (err) {
    return error(res, null, "Failed to delete user", 500);
  }
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    email,
    password: { $exists: true },
  });

  if (!user) {
    return error(res, null, "Sorry, we couldn't find your account.", 404);
  }

  if (!(await user.matchPassword(password))) {
    return error(res, null, "Invalid credentials", 401);
  }

  const userData = {
    ...user.toObject(),
    token: generateToken(user._id, { expiresIn: "1d" }),
  };

  return success(res, {
    user: userData,
    otp: user.emailVerifiedAt ? false : true,
  });
});

const register = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user) {
    return error(res, null, "Email already in use.", 409);
  }

  try {
    const hashedPassword = await hasher(password);
    const username = email.split("@")[0];
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
    });

    const token = generateToken(newUser._id, { expiresIn: 300 });

    sendVerificationLink({ email, name: username, token, id: newUser._id });

    return success(res, { user: newUser }, "Please verify your email");
  } catch (err) {
    return error(res, null, "Internal Server Error", 500);
  }
});

const resendVerificationLink = asyncHandler(async (req, res) => {
  const { id, email } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      return error(res, null, "User not found", 404);
    }

    if (!(await compareHash(user.email, email))) {
      return error(res, null, "Email does not match", 400);
    }

    if (user.emailVerifiedAt) {
      return error(res, null, "Email already verified", 409);
    }

    const newToken = generateToken(user._id, { expiresIn: 300 });

    sendVerificationLink({
      email: user.email,
      name: user.username,
      token: newToken,
      id: user._id,
    });

    return success(res, null, "Verification link resent to your email");
  } catch (err) {
    return error(res, null, "Invalid token", 400);
  }
});

const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token, id, email } = req.body;

  if (!token || !email || !id) {
    return error(res, null, "Invalid credentials", 400);
  }

  try {
    const user = await User.findById(id).select("-password");

    if (!user) {
      return error(res, null, "User not found", 404);
    }

    if (user.emailVerifiedAt) {
      return error(res, null, "Email already verified", 409);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!user._id.equals(id) || !(await compareHash(user.email, email))) {
      return error(res, null, "Invalid token", 400);
    }

    user.emailVerifiedAt = new Date();
    await user.save();

    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return success(
      res,
      { token: newToken, user },
      "Email verified and user logged in"
    );
  } catch (err) {
    console.error(err, "ln173");
    return error(res, null, "Invalid or expired token", 400);
  }
});

const validateUsername = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const user = await User.findOne({
    $or: [{ username }, { generatedUsername: username }],
  }).select("_id username avatar");

  if (!user) {
    return error(
      res,
      null,
      "Sorry, we couldn't find the user you were looking for",
      404
    );
  }

  return success(res, { user });
});

const checkAuth = asyncHandler(async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded) {
      res.json({
        isAuthenticated: true,
      });
    }
  } catch (err) {
    res.json({
      isAuthenticated: false,
    });
  }
});

const onboard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    return error(res, null, "User not found", 404);
  }

  user.hasOnboard = true;
  await user.save();

  return success(res, { user }, "User onboarded successfully");
});

const validateToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded) {
      return success(res, null, "Token is valid");
    }
  } catch (err) {
    return error(res, null, "Invalid token", 403);
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return error(res, null, "Missing required fields", 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    return error(res, null, "Your email hasn't been registered", 404);
  }

  if (!user.password) {
    return error(res, null, "Registered via OAuth", 404);
  }

  try {
    const token = crypto.randomBytes(32).toString("hex");

    sendResetPasswordLink({
      name: user.username,
      id: user._id,
      email: user.email,
      token,
    });

    const hashedToken = await hasher(token);

    user.passwordReset.token = hashedToken;
    user.passwordReset.expiresAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    return success(res, null, "Password reset link sent");
  } catch (err) {
    console.log(err);
    return error(res, null, "Invalid user data");
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, id } = req.params;
  const { password, confirmPassword } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return error(res, null, "User not found", 404);
  }

  const { passwordReset, email, username } = user;
  const tokenValid = await compareHash(token, passwordReset.token);
  const tokenExpired = passwordReset.expiresAt < Date.now();

  if (!tokenValid) {
    return error(res, null, "Invalid reset token", 403);
  }

  if (tokenExpired) {
    return error(res, null, "Reset token has expired", 403);
  }

  if (password !== confirmPassword) {
    return error(res, null, "Passwords do not match", 400);
  }

  const hashedPassword = await hasher(password);
  user.password = hashedPassword;
  user.passwordChangedAt = Date.now();
  user.passwordReset = undefined;

  try {
    sendPasswordResetSuccess({ name: user.username, email: user.email });
    await user.save();
    return success(res, null, "Password reset successfully");
  } catch (err) {
    console.log(err);
    return error(res, null, "Failed to reset password", 500);
  }
});

const validateResetPasswordLink = asyncHandler(async (req, res) => {
  const { token, id } = req.params;

  const errorMessage =
    "It appears that the password reset link you clicked on is invalid. Please try again.";
  try {
    const user = await User.findById(id);

    if (!user || !user.passwordReset || !user.passwordReset.token) {
      return error(res, null, errorMessage, 400);
    }
    const { passwordReset } = user;

    const tokenValid = await compareHash(token, passwordReset.token);
    const tokenExpired = passwordReset.expiresAt < Date.now();

    if (!passwordReset || !user || !tokenValid || tokenExpired) {
      return error(res, null, errorMessage, 400);
    }

    return success(res, null, "Reset token is valid");
  } catch (err) {
    console.log(err);
    return error(res, null, errorMessage);
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    return error(res, null, "User not found", 404);
  }

  if (!user.password) {
    return error(res, null, "Account registered via OAuth", 400);
  }

  if (!(await compareHash(oldPassword, user.password))) {
    return error(res, null, "Invalid old password", 401);
  }

  if (newPassword !== confirmPassword) {
    return error(res, null, "Passwords do not match", 400);
  }

  const hashedPassword = await hasher(newPassword);
  user.password = hashedPassword;
  await user.save();

  return success(res, null, "Password updated successfully");
});

const checkUsernameAvailability = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });

  if (user) {
    return error(res, null, "Username already taken", 409);
  }

  return success(res, null, `${username} is available`);
});

const updateUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return error(res, null, "Missing required fields", 400);
  }

  const usernameTaken = await User.findOne({ username });

  if (usernameTaken && usernameTaken._id.equals(req.user._id)) {
    return error(res, null, "Username already taken", 409);
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username },
      { new: true }
    ).select("-password");

    return success(res, { user }, "Username updated successfully");
  } catch (err) {
    return error(res, null, "An error occurred");
  }
});

const uploadProfilePicture = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return error(res, null, "Username not found", 404);
    }
    if (!req.file) {
      return error(res, null, "No file uploaded", 400);
    }

    cloudinary.uploader.upload(
      req.file.path,
      { folder: "profile_pictures" },
      async (err, result) => {
        if (err) {
          return error(res, null, "Cannot upload profile picture");
        }
        const newImage = result.secure_url;

        if (user.avatar) {
          const publicId = user.avatar.split("/").pop().split(".")[0];
          console.log(publicId);
          await cloudinary.uploader
            .destroy(`profile_pictures/${publicId}`)
            .then((res) => {
              console.log(res);
            });
        }

        user.avatar = newImage;
        await user.save();

        return success(res, { user }, "Profile picture updated successfully");
      }
    );
  } catch (err) {
    return error(res, null, "Internal Server Error");
  }
});

/**
 * 
 * const uploadProfilePicture = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return error(res, null, "User not found", 404);
    }
    if (!req.file) {
      return error(res, null, "No file uploaded", 400);
    }

    // Upload the new image
    cloudinary.uploader.upload(
      req.file.path,
      { folder: "profile_pictures" },
      async (err, result) => {
        if (err) {
          return error(res, null, "Cannot upload profile picture");
        }

        const newImage = result.secure_url;
        const publicId = result.public_id;

        // Generate the pixelated URL
        const pixelatedImage = cloudinary.url(publicId, {
          transformation: [
            { effect: "pixelate:120" },
            { quality: "1" },
            { fetch_format: "auto" }
          ]
        });

        // Delete old image if it exists
        if (user.avatar) {
          const oldPublicId = user.avatar.split('/').pop().split('.')[0];
          if (oldPublicId) {
            await cloudinary.uploader.destroy(`profile_pictures/${oldPublicId}`);
          }
        }

        // Update user with new image URLs
        user.avatar = newImage;
        user.pixelatedAvatar = pixelatedImage;
        await user.save();

        return success(res, { user }, "Profile picture updated successfully");
      }
    );
  } catch (err) {
    console.error(err); // Log error details for debugging
    return error(res, null, "Internal Server Error");
  }
});

 */

export {
  getSelf,
  logout,
  login,
  register,
  resendVerificationLink,
  verifyEmail,
  deleteSelf,
  validateUsername,
  checkAuth,
  onboard,
  validateToken,
  forgotPassword,
  resetPassword,
  validateResetPasswordLink,
  updatePassword,
  checkUsernameAvailability,
  updateUsername,
  uploadProfilePicture,
};
