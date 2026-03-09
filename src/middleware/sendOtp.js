import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();   // ensure env variables exist here

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOTP = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.log("Email error:", error);
  }
};