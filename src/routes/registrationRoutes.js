import express from "express";
import {
  getHostRegistrations,
  getEventRegistrations,
  registerForEvent,
  cancelRegistration,
} from "../controllers/registrationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Host: all attendees across all their events (one-shot load)
router.get("/host", protect, getHostRegistrations);

// Host: attendees for a specific event (on pill switch)
router.get("/event/:eventId", protect, getEventRegistrations);

// Participant: register
router.post("/", protect, registerForEvent);

// Participant: cancel
router.delete("/:registrationId", protect, cancelRegistration);

export default router;