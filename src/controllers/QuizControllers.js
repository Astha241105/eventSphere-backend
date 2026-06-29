// controllers/quizController.js
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js"; // adjust path/fields if different

const getEventWindow = (event) => {
  const start = new Date(event.eventStart || event.date || event.startDate);
  const end = new Date(event.eventEnd || event.endDate || start.getTime() + 30 * 60 * 1000);
  return { start, end };
};

// GET /api/quiz/event/:eventId  → for participant, gated by time + registration
export const getQuizForParticipant = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id; // from protect middleware

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isRegistered = await Registration.findOne({ eventId, userId });
    if (!isRegistered) {
      return res.status(403).json({ message: "You are not registered for this event" });
    }

    const { start, end } = getEventWindow(event);
    const now = new Date();

    if (now < start) {
      return res.status(403).json({
        message: "Quiz has not started yet",
        startsAt: start,
      });
    }
    if (now > end) {
      return res.status(403).json({ message: "Quiz has ended" });
    }

    const quiz = await Quiz.findOne({ eventId });
    if (!quiz) return res.status(404).json({ message: "No quiz found for this event" });

    const existingAttempt = await QuizAttempt.findOne({ quizId: quiz._id, userId });
    if (existingAttempt) {
      return res.status(409).json({
        message: "You have already submitted this quiz",
        attempt: existingAttempt,
      });
    }

    // Strip correct answers before sending to participant
    const safeQuestions = quiz.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      points: q.points,
      timeLimit: q.timeLimit,
    }));

    res.json({
      quizId: quiz._id,
      eventId,
      eventTitle: event.eventName || event.title,
      questions: safeQuestions,
      endsAt: end,
    });
  } catch (err) {
    console.error("Get quiz error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/quiz/:quizId/submit  body: { answers: [{ questionIndex, selectedOption }] }
export const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const existing = await QuizAttempt.findOne({ quizId, userId });
    if (existing) return res.status(409).json({ message: "Already submitted" });

    let score = 0;
    const scoredAnswers = (answers || []).map((a) => {
      const question = quiz.questions[a.questionIndex];
      if (!question) {
        return { ...a, isCorrect: false, pointsEarned: 0 };
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
      quizId,
      eventId: quiz.eventId,
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
    console.error("Submit quiz error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/quiz/event/:eventId/results  → host only
export const getQuizResults = async (req, res) => {
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
    console.error("Quiz results error:", err);
    res.status(500).json({ message: "Server error" });
  }
};