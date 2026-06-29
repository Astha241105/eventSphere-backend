import express from "express";
const router = express.Router();

import {
  uploadCover,
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
} from "../controllers/eventController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import seatRouter from "./seatRoutes.js";

// ── Public routes ─────────────────────────────────────────────────────────────
router.get("/",    getAllEvents);
router.get("/:id", getEventById);

// ── Private routes ────────────────────────────────────────────────────────────
router.get("/host/my-events", protect, authorizeRoles("host"), getMyEvents);

router.post(
  "/",
  protect,
  authorizeRoles("host"),
  uploadCover,
  createEvent
);

router.put(
  "/:id",
  protect,
  authorizeRoles("host"),
  uploadCover,
  updateEvent
);

router.delete("/:id", protect, authorizeRoles("host"), deleteEvent);

// ── Seat booking sub-router ───────────────────────────────────────────────────
// Mounts: /api/events/:eventId/rooms and /api/events/:eventId/my-booking
router.use("/:eventId", seatRouter);

export default router;