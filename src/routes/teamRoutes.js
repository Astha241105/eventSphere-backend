import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTeam,
  getEventTeams,
  getTeamDetail,
  updateTeam,
  joinPool,
  leavePool,
  getPoolMembers,
  sendRequest,
  handleRequest,
  withdrawRequest,
} from "../controllers/teamController.js";

const router = express.Router();

// ── Teams ──────────────────────────────────────────────────────
router.post("/",                   protect, createTeam);
router.get("/event/:eventId",      protect, getEventTeams);
router.get("/:teamId",             protect, getTeamDetail);
router.patch("/:teamId",           protect, updateTeam);

// ── Pool ───────────────────────────────────────────────────────
router.post("/pool/:eventId",      protect, joinPool);
router.delete("/pool/:eventId",    protect, leavePool);
router.get("/pool/:eventId",       protect, getPoolMembers);

// ── Requests ───────────────────────────────────────────────────
router.post("/:teamId/request",          protect, sendRequest);
router.patch("/requests/:requestId",     protect, handleRequest);
router.delete("/requests/:requestId",    protect, withdrawRequest);

export default router;