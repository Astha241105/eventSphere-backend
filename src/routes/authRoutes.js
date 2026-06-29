import express from "express";

import {
  register,
  login,
  verifyOTP,
  forgotPassword,
  verifyResetOtp,
  resetPassword
} from "../controllers/authControllers.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Registration OTP
router.post("/verify-otp", verifyOTP);

// Forgot Password Flow
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

export default router;