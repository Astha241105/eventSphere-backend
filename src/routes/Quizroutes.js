// routes/quiz.js
import express from "express";
import mongoose from "mongoose";
import Quiz from "../models/quiz.js";
import Event from "../models/Event.js";
import QuizAttempt from "../models/QuizAttempt.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"; // adjust path as needed

const router = express.Router();

// ── helper: get event time window ────────────────────────────────────────
const getEventWindow = (event) => {
  const start = new Date(event.eventStart || event.date || event.startDate);
  const end = new Date(
    event.eventEnd || event.endDate || start.getTime() + 30 * 60 * 1000
  );
  return { start, end };
};

// POST /api/quiz — create or replace quiz questions for an event
router.post("/", protect, async (req, res) => {
  try {
    const { eventId, questions } = req.body;

    if (!eventId) return res.status(400).json({ message: "eventId is required" });

    const quiz = await Quiz.findOneAndUpdate(
      { eventId },
      { eventId, questions },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ message: "Quiz saved", quiz });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/quiz/:eventId — fetch quiz (host view, includes correct answers)
router.get("/:eventId", protect, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ eventId: req.params.eventId });
    if (!quiz) return res.status(404).json({ message: "No quiz found for this event" });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/quiz/:eventId/play — fetch quiz WITHOUT correct answers (participant view)
// Now also gates by event timing and blocks repeat attempts.
router.get("/:eventId/play", protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const { start, end } = getEventWindow(event);
    const now = new Date();

    if (now < start) {
      return res.status(403).json({ message: "Quiz has not started yet", startsAt: start });
    }
    if (now > end) {
      return res.status(403).json({ message: "Quiz has ended" });
    }

    const quiz = await Quiz.findOne({ eventId }).lean();
    if (!quiz) return res.status(404).json({ message: "No quiz found" });

    const existingAttempt = await QuizAttempt.findOne({ quizId: quiz._id, userId });
    if (existingAttempt) {
      return res.status(409).json({
        message: "You have already submitted this quiz",
        attempt: existingAttempt,
      });
    }

    // Strip correctOptionIndex from each question before sending to participants
    const safeQuestions = quiz.questions.map(({ correctOptionIndex, ...rest }) => rest);
    res.json({ ...quiz, questions: safeQuestions, endsAt: end });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/quiz/:eventId/submit — participant submits answers
// body: { answers: [{ questionIndex, selectedOption }] }
router.post("/:eventId/submit", protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { answers } = req.body;
    const userId = req.user._id;

    const quiz = await Quiz.findOne({ eventId });
    if (!quiz) return res.status(404).json({ message: "No quiz found for this event" });

    const existing = await QuizAttempt.findOne({ quizId: quiz._id, userId });
    if (existing) return res.status(409).json({ message: "Already submitted" });

    let score = 0;
    const scoredAnswers = (answers || []).map((a) => {
      const question = quiz.questions[a.questionIndex];
      if (!question) {
        return { questionIndex: a.questionIndex, selectedOption: a.selectedOption, isCorrect: false, pointsEarned: 0 };
      }
      const isCorrect = question.correctOptionIndex === a.selectedOption;
      const pointsEarned = isCorrect ? question.points : 0;
      score += pointsEarned;
      return {
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        isCorrect,
        pointsEarned,
      };
    });

    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      eventId,
      userId,
      answers: scoredAnswers,
      score,
      totalPoints: quiz.totalPoints,
    });

    res.status(201).json({ message: "Quiz submitted", attempt });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Already submitted" });
    }
    res.status(500).json({ message: err.message });
  }
});

// GET /api/quiz/:eventId/results — host-only leaderboard
router.get("/:eventId/results", protect, authorizeRoles("host"), async (req, res) => {
  try {
    const { eventId } = req.params;

    const quiz = await Quiz.findOne({ eventId });
    if (!quiz) return res.status(404).json({ message: "No quiz found for this event" });

    const attempts = await QuizAttempt.find({ quizId: quiz._id })
      .populate("userId", "name email")
      .sort({ score: -1, submittedAt: 1 });

    res.json({
      quizId: quiz._id,
      totalPoints: quiz.totalPoints,
      totalAttempts: attempts.length,
      leaderboard: attempts.map((a, i) => ({
        rank: i + 1,
        userId: a.userId._id,
        name: a.userId.name,
        email: a.userId.email,
        score: a.score,
        submittedAt: a.submittedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;