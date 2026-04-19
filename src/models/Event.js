const express = require("express");
const router = express.Router();

const {
  uploadCover,
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
} = require("../controllers/createevent");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Public routes
router.get("/",     getAllEvents);
router.get("/:id",  getEventById);

// Private routes
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

module.exports = router;