// models/QuizAttempt.js
import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  selectedOption: { type: Number, required: true }, // 0-3
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, default: 0 },
});

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId:  { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: [answerSchema],
    score:   { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One attempt per user per quiz
quizAttemptSchema.index({ quizId: 1, userId: 1 }, { unique: true });

const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
export default QuizAttempt;