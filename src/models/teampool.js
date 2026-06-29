import mongoose from "mongoose";

const teamPoolSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user:  { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
  },
  { timestamps: true }
);

teamPoolSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model("TeamPool", teamPoolSchema);