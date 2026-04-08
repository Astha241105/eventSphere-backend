import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },

  status: {
    type: String,
    enum: ["registered", "attended", "cancelled"],
    default: "registered",
  },

  role: {
    type: String,
    enum: ["participant", "speaker"],
    default: "participant",
  },

  registeredAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

/* 🔥 IMPORTANT INDEXES */
registrationSchema.index({ userId: 1 });
registrationSchema.index({ eventId: 1 });
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);