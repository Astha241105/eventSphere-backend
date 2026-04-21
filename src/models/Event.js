import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    eventName:          { type: String, required: true, trim: true },
    category:           { type: String, enum: ["Hackathon", "Webinar", "Seminar", "Quiz"], default: "Hackathon" },
    description:        { type: String, default: "" },
    tagline:            { type: String, default: "" },
    coverImage:         { type: String, default: null },   // stored file path

    registrationOpen:   { type: Date },
    registrationClose:  { type: Date },
    eventStart:         { type: Date },
    eventEnd:           { type: Date },
    submissionDeadline: { type: Date },
    resultsDate:        { type: Date },

    mode:               { type: String, enum: ["in-person", "online", "hybrid"], default: "hybrid" },
    venueName:          { type: String, default: "" },
    venueAddress:       { type: String, default: "" },
    city:               { type: String, default: "" },
    onlineLink:         { type: String, default: "" },

    minTeamSize:        { type: Number, default: 1 },
    maxTeamSize:        { type: Number, default: 4 },
    eligibleFor:        { type: [String], default: [] },
    ageMin:             { type: String, default: "" },
    ageMax:             { type: String, default: "" },
    skills:             { type: String, default: "" },
    openTo:             { type: String, enum: ["everyone", "students", "professionals"], default: "everyone" },

    firstPrize:         { type: String, default: "" },
    secondPrize:        { type: String, default: "" },
    thirdPrize:         { type: String, default: "" },
    totalPool:          { type: String, default: "" },

    status:             { type: String, enum: ["draft", "review", "live"], default: "review" },

    // Reference to the host who created the event
    createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);