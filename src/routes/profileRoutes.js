import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getProfile,
  getUpcoming,
  getPast,
  getOngoing,
} from "../controllers/profileControllers.js";

const router = express.Router();

// All profile routes require auth
router.get("/",         protect, getProfile);
router.get("/upcoming", protect, getUpcoming);
router.get("/past",     protect, getPast);
router.get("/ongoing",  protect, getOngoing);  // replaces /favourites

export default router;