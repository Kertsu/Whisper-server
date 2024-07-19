import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Conversation from "./conversationsModel.js";
import Message from "./messageModel.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      maxLength: 50
    },
    generatedUsername: {
      type: String,
      default: null,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    hasOnboard: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    passwordReset: {
      token: {
        type: String,
      },
      expiresAt: {
        type: Date,
      },
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    }
  },
  { timestamps: true }
);

userSchema.pre("findOneAndDelete", async function (next) {
  try {
    const userId = this.getQuery()._id;

    await Conversation.updateMany(
      { initiator: userId },
      { $set: { initiator: null } }
    );

    await Conversation.updateMany(
      { recipient: userId },
      { $set: { recipient: null } }
    );

    await Message.updateMany({ sender: userId }, { $set: { sender: null } });

    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
