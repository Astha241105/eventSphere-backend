import mongoose from "mongoose";

const resetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    otp: {
      type: String,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // Automatically delete after 5 minutes
    },
  },
  { timestamps: true }
);

const ResetOtp = mongoose.model("ResetOtp", resetOtpSchema);

export default ResetOtp;