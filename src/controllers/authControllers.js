import User from "../models/User.js";
import Otp from "../models/Otp.js";
import otpGenerator from "otp-generator";
import bcrypt from "bcrypt";   // For hashing passwords
import jwt from "jsonwebtoken"; // For generating JWT tokens and verifying them
import { sendOTP } from "../middleware/sendOtp.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// REGISTER
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // generate otp
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });

    console.log(`Generated OTP for ${email}: ${otp}`);

    // delete old OTP if exists
    await Otp.deleteMany({ email });

    // store registration data temporarily
    await Otp.create({
      email,
      name,
      password: hashedPassword,
      role,
      otp
    });

    await sendOTP(email, otp);

    res.status(200).json({
      message: "OTP sent to your email"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// otp verification and create user
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {

    const record = await Otp.findOne({ email });

    if (!record)
      return res.status(400).json({ message: "OTP expired" });

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const user = await User.create({
      name: record.name,
      email: record.email,
      password: record.password,
      role: record.role
    });
    console.log(`User ${email} registered successfully`);

    await Otp.deleteOne({ email });

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {

    const user = await User.findOne({ email });

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// FORGOT PASSWORD - send OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });

    console.log(`Reset OTP for ${email}: ${otp}`);

    // remove previous otp if exists
    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otp
    });

    await sendOTP(email, otp);

    res.status(200).json({
      message: "OTP sent to email"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// VERIFY RESET OTP
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email });

    if (!record || record.otp !== otp)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    res.status(200).json({
      message: "OTP verified"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ message: "User not found" });

    await Otp.deleteMany({ email });

    res.status(200).json({
      message: "Password updated successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
