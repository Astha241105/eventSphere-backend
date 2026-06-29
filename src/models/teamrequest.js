import mongoose from "mongoose";

const teamRequestSchema = new mongoose.Schema(
  {
    team:   { type: mongoose.Schema.Types.ObjectId, ref: "Team",  required: true },
    event:  { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    from:   { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

// One pending request per user per team
teamRequestSchema.index({ team: 1, from: 1 }, { unique: true });

export default mongoose.model("TeamRequest", teamRequestSchema);