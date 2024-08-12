import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    content: {
      type: String,
      required: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered"],
      default: "sent",
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
