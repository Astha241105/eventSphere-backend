import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getRooms, bookSeats, cancelBooking, getMyBooking } from "../controllers/seatController.js";

// mergeParams lets us read :eventId from the parent events router
const router = express.Router({ mergeParams: true });

router.get("/rooms",                          getRooms);           // public
router.post("/rooms/:roomId/book",            protect, bookSeats);
router.delete("/rooms/:roomId/book/:seatId",  protect, cancelBooking);
router.get("/my-booking",                     protect, getMyBooking);

export default router;