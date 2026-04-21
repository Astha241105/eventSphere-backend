import fs from "fs";
import multer from "multer";
import Event from "../models/Event.js";
import { fileURLToPath } from "url";
import path from "path";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Multer config ──────────────────────────────────────────
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
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  extOk && mimeOk ? cb(null, true) : cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed"));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

// Export multer middleware for use in routes
const uploadCover = upload.single("coverImage");

// ── @route  POST /api/events
// ── @access Private (host only)
const createEvent = async (req, res) => {
  try {
    const body = { ...req.body };

    // Parse eligibleFor array (sent as JSON string from FormData)
    if (body.eligibleFor) {
      try { body.eligibleFor = JSON.parse(body.eligibleFor); }
      catch { body.eligibleFor = []; }
    }

    // Attach uploaded cover image path
    if (req.file) {
      body.coverImage = `/uploads/${req.file.filename}`;
    }

    // Attach the logged-in user as creator
    body.createdBy = req.user._id;

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
    if (mode) filter.mode = mode;
    if (status) filter.status = status;
    if (search) filter.eventName = { $regex: search, $options: "i" };

    const events = await Event.find(filter)
      .populate("createdBy", "fullName email avatar organization")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── @route  GET /api/events/:id
// ── @access Public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "fullName email avatar organization");

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

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

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Only the creator can update
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this event" });
    }

    const body = { ...req.body };

    if (body.eligibleFor) {
      try { body.eligibleFor = JSON.parse(body.eligibleFor); }
      catch { body.eligibleFor = []; }
    }

    if (req.file) {
      // Delete old cover image if exists
      if (event.coverImage) {
        const oldPath = path.join(__dirname, "../../", event.coverImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      body.coverImage = `/uploads/${req.file.filename}`;
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
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

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this event" });
    }

    // Delete cover image from disk
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

// ── @route  GET /api/events/my-events
// ── @access Private (host)
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
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