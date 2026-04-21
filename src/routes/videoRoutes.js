import express from "express";
import { getRoomStatus, getRoomParticipants } from "../controllers/videoController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// In-memory store: eventId -> [{ userId, userName, socketId }]
// For production, replace with Redis
export const roomStore = new Map();

// GET /api/video/room/:eventId/status
router.get("/room/:eventId/status", authMiddleware, getRoomStatus);

// GET /api/video/room/:eventId/participants
router.get("/room/:eventId/participants", authMiddleware, getRoomParticipants(roomStore));

export { router };