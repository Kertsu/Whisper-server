import mongoose from "mongoose";

const reportTokenSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportType: {
      type: String,
      enum: [
        "spam",
        "hate speech",
        "inappropriate content",
        "impersonation",
        "threats of violence",
        "privacy violation",
        "suicidal content",
        "illegal activity",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["reviewing", "resolved"],
      default: "reviewing",
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportTokenSchema);

export default Report;
