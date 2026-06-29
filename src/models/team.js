import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    event:   { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    name:    { type: String, required: true, trim: true },
    leader:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    maxSize: { type: Number, required: true },
    isOpen:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Team", teamSchema);