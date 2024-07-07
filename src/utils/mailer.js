import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from 'bcryptjs'
import User from "../models/userModel.js";

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
      link: "https://whisper-link.vercel.app",
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

const sendOTP = async (data) => {
  const verificationCode = generateOTP();
  let { mailGenerator } = setupTransporterAndMailGen();
  const { name, email } = data;
  var emailMessage = {
    body: {
      name,
      intro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">We are excited to have you join our community. To complete your registration and start exploring all the amazing features Whisper has to offer, please verify your email address using the OTP provided below.</p> 
        
        <div style="padding:.5rem 1.5rem; color: #24292e; border-radius: 6px; border:1px #cccccc solid; margin-bottom: 1rem !important; display: flex !important; align-items: center; width: max-content; justify-content:space-between;"><h3 style="margin: 0 !important;">${verificationCode}</h3>
        </div>
        `,
      outro: `<p style="font-size: 14px; color: #24292e; margin-bottom: 1rem !important;">If you have any questions, please feel free to contact me at <a href="mailto:kurtddbigtas@gmail.com">kurtddaniel@gmail.com</a></p>`,
    },
  };

  let mail = mailGenerator.generate(emailMessage);

  let message = {
    from: process.env.nmEMAIL,
    to: email,
    subject: "[Whisper] Verification Code",
    html: mail,
  };

  try {
    await sendEmail(message);

    const salt = await bcrypt.genSalt(10);
    const hashedVerificationCode = await bcrypt.hash(verificationCode, salt);

    await User.findOneAndUpdate(
      { email: data.email },
      {
        verification: {
          code: hashedVerificationCode,
          expiresAt: Date.now() + 10 * 60 * 1000,
        },
      }
    );
  } catch (err) {
    throw new Error("An error occurred: "+ err);
  }
};

export { sendOTP };
