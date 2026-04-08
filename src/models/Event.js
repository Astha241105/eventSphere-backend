import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: {
    type: Date,
    required: true,
  },
  location: String,
  type: {
    type: String,
    enum: ["online", "offline"],
  },

  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

export default mongoose.model("Event", eventSchema);