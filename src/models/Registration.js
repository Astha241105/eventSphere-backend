import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "waitlisted"],
      default: "confirmed",
    },
    teamName:    { type: String,   default: null },
    teamMembers: { type: [String], default: [] },
    roomId:      { type: mongoose.Schema.Types.ObjectId, default: null },
    seatId:      { type: mongoose.Schema.Types.ObjectId, default: null },
    ticketId:    { type: String,   default: null },
  },
  { timestamps: true }
);

// One registration per user per event
registrationSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);