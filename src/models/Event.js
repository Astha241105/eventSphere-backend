import mongoose from "mongoose";

// ── Seat subdocument ──────────────────────────────────────────────────────────
const seatSchema = new mongoose.Schema(
  {
    row:      { type: Number, required: true },
    col:      { type: Number, required: true },
    vip:      { type: Boolean, default: false },
    occupied: { type: Boolean, default: false },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    bookedByName: { type: String,  default: null },  // denormalised for quick display
    ticketId:     { type: String,  default: null },
    bookedAt:     { type: Date,    default: null },
  },
  { _id: true }
);

// ── Room subdocument ──────────────────────────────────────────────────────────
const roomSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    type:    {
      type: String,
      enum: ["Auditorium", "Theatre", "Conference", "Workshop", "Seminar Hall"],
      default: "Auditorium",
    },
    rows:    { type: Number, required: true, min: 1, max: 20 },
    cols:    { type: Number, required: true, min: 1, max: 20 },
    vipRows: { type: Number, default: 0, min: 0 },
    seats:   [seatSchema],
  },
  { _id: true }
);

// ── Event schema ──────────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    eventName:          { type: String, required: true, trim: true },
    category:           { type: String, enum: ["Hackathon", "Webinar", "Seminar", "Quiz"], default: "Hackathon" },
    description:        { type: String, default: "" },
    tagline:            { type: String, default: "" },
    coverImage:         { type: String, default: null },

    registrationOpen:   { type: Date },
    registrationClose:  { type: Date },
    eventStart:         { type: Date },
    eventEnd:           { type: Date },
    submissionDeadline: { type: Date },
    resultsDate:        { type: Date },

    mode:         { type: String, enum: ["in-person", "online", "hybrid"], default: "hybrid" },
    venueName:    { type: String, default: "" },
    venueAddress: { type: String, default: "" },
    city:         { type: String, default: "" },
    onlineLink:   { type: String, default: "" },

    minTeamSize: { type: Number, default: 1 },
    maxTeamSize: { type: Number, default: 4 },
    eligibleFor: { type: [String], default: [] },
    skills:      { type: String, default: "" },
    openTo:      { type: String, enum: ["everyone", "students", "professionals"], default: "everyone" },

    firstPrize:  { type: String, default: "" },
    secondPrize: { type: String, default: "" },
    thirdPrize:  { type: String, default: "" },
    totalPool:   { type: String, default: "" },

    // Seminar rooms — empty for all other categories
    rooms: { type: [roomSchema], default: [] },

    status:    { type: String, enum: ["draft", "review", "live"], default: "review" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);