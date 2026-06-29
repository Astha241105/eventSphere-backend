import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, trim: true },
  options: {
    type: [String],
    validate: {
      validator: (arr) => arr.length === 4,
      message: "Each question must have exactly 4 options.",
    },
  },
  correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
  points:    { type: Number, default: 10 },
  timeLimit: { type: Number, default: 30 },
});

const quizSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },
    questions: [questionSchema],
    totalPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

quizSchema.pre("save", function (next) {
  this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  next();
});

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;