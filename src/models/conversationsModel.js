import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    initiatorUsername: {
      type: String,
      required: true,
      unique: true,
    },
    blockedByInitiator: {
      type: Boolean,
      default: false,
    },
    blockedByRecipient: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
