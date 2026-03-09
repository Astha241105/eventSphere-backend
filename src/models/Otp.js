import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["participant", "host"],
    default: "participant"
  },

  otp: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300
  }
});

export default mongoose.model("Otp", otpSchema);