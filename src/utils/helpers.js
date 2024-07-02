import crypto from "crypto";
import Conversation from "../models/conversationsModel.js";

export const generateInitiatorUsername = async () => {
  let randomUsername;
  do {
    randomUsername = crypto.randomBytes(16);
    randomUsername = "Whisp_" + randomUsername.toString("hex").slice(0, 8);
  } while (await Conversation.findOne({ initiatorUsername: randomUsername }));

  return randomUsername;
};
