import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  getProfile,
  getUpcomingEvents,
  getPastEvents,
  getFavouriteEvents
} from "../controllers/profileControllers.js";

const router = express.Router();

router.get("/", protect, getProfile);
router.get("/upcoming", protect, getUpcomingEvents);
router.get("/past", protect, getPastEvents);
router.get("/favourites", protect, getFavouriteEvents);

export default router;