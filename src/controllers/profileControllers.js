// controllers/profileControllers.js
import User from "../models/User.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

const now = () => new Date();

// ── GET /api/profile ──────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/profile/upcoming ─────────────────────────────────────────────────
export const getUpcoming = async (req, res) => {
  try {
    const isHost = req.user.role === "host";
    let events = [];

    if (isHost) {
      events = await Event.find({
        createdBy: req.user._id,
        eventStart: { $gt: now() },
      }).sort({ eventStart: 1 });
    } else {
      const regs = await Registration.find({ user: req.user._id })
        .populate("event");

      events = regs
        .filter((r) => r.event && new Date(r.event.eventStart) > now())
        .sort((a, b) => new Date(a.event.eventStart) - new Date(b.event.eventStart))
        .map((r) => ({ ...r.event.toObject(), ticketId: r.ticketId || null }));
    }

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/profile/past ─────────────────────────────────────────────────────
export const getPast = async (req, res) => {
  try {
    const isHost = req.user.role === "host";
    let events = [];

    if (isHost) {
      events = await Event.find({
        createdBy: req.user._id,
        eventEnd: { $lt: now() },
      }).sort({ eventEnd: -1 });
    } else {
      const regs = await Registration.find({ user: req.user._id })
        .populate("event");

      events = regs
        .filter((r) => r.event && new Date(r.event.eventEnd) < now())
        .sort((a, b) => new Date(b.event.eventEnd) - new Date(a.event.eventEnd))
        .map((r) => ({ ...r.event.toObject(), status: r.status }));
    }

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/profile/ongoing ──────────────────────────────────────────────────
export const getOngoing = async (req, res) => {
  try {
    const isHost = req.user.role === "host";
    let events = [];

    if (isHost) {
      events = await Event.find({
        createdBy: req.user._id,
        eventStart: { $lte: now() },
        eventEnd:   { $gte: now() },
      }).sort({ eventEnd: 1 });
    } else {
      const regs = await Registration.find({ user: req.user._id })
        .populate("event");

      events = regs
        .filter(
          (r) =>
            r.event &&
            new Date(r.event.eventStart) <= now() &&
            r.event.eventEnd &&
            new Date(r.event.eventEnd) >= now()
        )
        .sort((a, b) => new Date(a.event.eventEnd) - new Date(b.event.eventEnd))
        .map((r) => r.event.toObject());
    }

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};