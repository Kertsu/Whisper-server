import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";

const link = process.env.APP_URL;

const generateOTP = () => {
  return crypto.randomInt(1000000, 9999999).toString();
};

const setupTransporterAndMailGen = () => {
  let config = {
    service: "gmail",
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  let transporter = nodemailer.createTransport(config);

  let mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Whisper",
      link,
    },
  });

  return { transporter, mailGenerator };
};

const sendEmail = async (message) => {
  try {
    let { transporter } = setupTransporterAndMailGen();
    await transporter.sendMail(message);
  } catch (error) {
    throw new Error("Error sending email: " + error);
  }
};

const sendVerificationLink = async (data) => {
  let { mailGenerator } = setupTransporterAndMailGen();
  const { name, email, token } = data;
  var emailMessage = {
    body: {
      name,
      intro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">We are excited to have you join our community. To complete your registration and start exploring all the amazing features Whisper has to offer, please verify your email address by clicking the button below. This link will expire after 5 minutes, please use it accordingly.</p> 
        
        <a style="padding: 0.5rem 1.5rem; color: white; background-color:#3b82f6; text-decoration:none; border-radius: 6px; border: 1px solid #3B82F6; width: max-content;display: block;margin-bottom: 1rem !important;" href="${link}/auth/verify/${token}/${email}" target="_blank">Verify now</a>
        `,
      outro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">If you have any questions, please feel free to contact me at <a href="mailto:kurtddbigtas@gmail.com">kurtddaniel@gmail.com</a></p>`,
    },
  };

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: email,
    subject: "[Whisper] Email Verification",
    html: mail,
  };

  try {
    await sendEmail(message);

  } catch (err) {
    throw new Error("An error occurred: " + err);
  }
};

export { sendVerificationLink };
