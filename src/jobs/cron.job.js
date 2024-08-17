import cron from "node-cron";
import RefreshToken from "../models/refreshToken.model.js";
import axios from "axios";

const SERVICE_URL = process.env.SERVICE_URL;

export const refreshTokenCleanup = async () => {
  cron.schedule("* * * * *", async () => {
    const now = Date.now();
    await RefreshToken.deleteMany({ expirationDate: { $lt: now } });
  });
};

export const keepAlive = async () => {
  cron.schedule("*/14 * * * *", async () => {
    try {
      const response = await axios.get(`${SERVICE_URL}/hello-world`);
      console.log(`Service is up. Status code: ${response.status}`);
    } catch (error) {
      console.error(`Failed to ping the service: ${error.message}`);
    }
  });
};
