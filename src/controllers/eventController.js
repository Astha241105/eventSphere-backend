import fs from "fs";
import multer from "multer";
import Event from "../models/Event.js";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Multer config ─────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk  = allowed.test(file.mimetype);
  extOk && mimeOk ? cb(null, true) : cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed"));
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
const uploadCover = upload.single("coverImage");

// ── Helper ────────────────────────────────────────────────────────────────────
const parseJSON = (val, fallback) => {
  if (!val) return fallback;
  try { return JSON.parse(val); }
  catch { return fallback; }
};

// Builds the full seat grid from room config
const buildSeats = (rows, cols, vipRows) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({ row: r, col: c, vip: r < vipRows, occupied: false });
    }
  }
  return seats;
};

// ── @route  POST /api/events
// ── @access Private (host only)
const createEvent = async (req, res) => {
  try {
    const body = { ...req.body };

    // Arrays sent as JSON strings from FormData
    body.eligibleFor = parseJSON(body.eligibleFor, []);

    // Cover image
    if (req.file) {
      body.coverImage = `/uploads/${req.file.filename}`;
    }

    // Creator
    body.createdBy = req.user._id;

    // ── Rooms (Seminar only) ──────────────────────────────────────────────────
    // Frontend sends: rooms = JSON.stringify([{ name, type, rows, cols, vipRows }])
    // We generate seats server-side so the seat grid is always correct
    const rawRooms = parseJSON(body.rooms, []);

    body.rooms = rawRooms.map((r) => {
      const rows    = Math.min(20, Math.max(1, Number(r.rows)    || 1));
      const cols    = Math.min(20, Math.max(1, Number(r.cols)    || 1));
      const vipRows = Math.min(rows, Math.max(0, Number(r.vipRows) || 0));
      return {
        name:    (r.name || "Room").trim(),
        type:    r.type || "Auditorium",
        rows,
        cols,
        vipRows,
        seats:   buildSeats(rows, cols, vipRows),
      };
    });

    const event = await Event.create(body);

    res.status(201).json({
      success: true,
      message: "Event created successfully and submitted for review",
      event,
    });
  } catch (error) {
    console.error("Create event error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── @route  GET /api/events
// ── @access Public
const getAllEvents = async (req, res) => {
  try {
    const { category, mode, status, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (mode)     filter.mode     = mode;
    if (status)   filter.status   = status;
    if (search)   filter.eventName = { $regex: search, $options: "i" };

    const events = await Event.find(filter)
      .populate("createdBy", "fullName email avatar organization")
      .sort({ createdAt: -1 })
      .select("-rooms.seats"); // exclude heavy seat arrays in list view

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @route  GET /api/events/:id
// ── @access Public  (includes full seat data for booking page)
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "fullName email avatar organization")
      .populate("rooms.seats.bookedBy", "fullName email");

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @route  PUT /api/events/:id
// ── @access Private (host who created it)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (event.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not authorized to update this event" });

    const body = { ...req.body };
    if (body.eligibleFor) {
      try { body.eligibleFor = JSON.parse(body.eligibleFor); }
      catch { body.eligibleFor = []; }
    }

    if (req.file) {
      if (event.coverImage) {
        const oldPath = path.join(__dirname, "../../", event.coverImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      body.coverImage = `/uploads/${req.file.filename}`;
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, body, {
      new: true, runValidators: true,
    });

    res.json({ success: true, message: "Event updated successfully", event: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── @route  DELETE /api/events/:id
// ── @access Private (host who created it)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (event.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not authorized to delete this event" });

    if (event.coverImage) {
      const imgPath = path.join(__dirname, "../../", event.coverImage);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await event.deleteOne();
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @route  GET /api/events/host/my-events
// ── @access Private (host)
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .select("-rooms.seats");
    res.json({ success: true, count: events.length, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  uploadCover,
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
};