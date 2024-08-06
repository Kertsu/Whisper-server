import webPush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webPush.setVapidDetails(
  `mailto:${process.env.APP_EMAIL}`,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export default webPush;
