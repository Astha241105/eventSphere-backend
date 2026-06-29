import crypto from "crypto";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

const genTicket = () => "TKT-" + crypto.randomBytes(4).toString("hex").toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/:eventId/rooms
// Public — returns seat map. Occupied seats show no personal info.
// ─────────────────────────────────────────────────────────────────────────────
export const getRooms = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select("rooms category eventName registrationClose");

    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });

    if (event.category !== "Seminar")
      return res.status(400).json({ success: false, message: "Seat booking is only for Seminars" });

    // Sanitise: strip bookedBy ObjectId from public response, keep only
    // occupied + vip flags + position so the seat map can colour correctly
    const sanitisedRooms = event.rooms.map((room) => ({
      _id:     room._id,
      name:    room.name,
      type:    room.type,
      rows:    room.rows,
      cols:    room.cols,
      vipRows: room.vipRows,
      seats: room.seats.map((s) => ({
        _id:      s._id,
        row:      s.row,
        col:      s.col,
        vip:      s.vip,
        occupied: s.occupied,
        ticketId: s.occupied ? s.ticketId : null,   // show ticket only if occupied
        // never expose bookedBy to public endpoint
      })),
    }));

    res.json({ success: true, rooms: sanitisedRooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/events/:eventId/rooms/:roomId/book
// Body: { seatIds: ["<seatId>"] }   ← participant books exactly ONE seat
// Also creates/updates a Registration document for the event
// ─────────────────────────────────────────────────────────────────────────────
export const bookSeats = async (req, res) => {
  try {
    const { eventId, roomId } = req.params;
    const { seatIds }         = req.body;

    // Validate input
    if (!Array.isArray(seatIds) || seatIds.length === 0)
      return res.status(400).json({ success: false, message: "Provide at least one seatId" });

    const event = await Event.findById(eventId);
    if (!event)
      return res.status(404).json({ success: false, message: "Event not found" });
    if (event.category !== "Seminar")
      return res.status(400).json({ success: false, message: "Seat booking is only for Seminars" });

    // Registration window check
    const now = new Date();
    if (event.registrationClose && now > new Date(event.registrationClose))
      return res.status(400).json({ success: false, message: "Registration has closed" });

    const room = event.rooms.id(roomId);
    if (!room)
      return res.status(404).json({ success: false, message: "Room not found" });

    // Check if user already has a confirmed registration for this event
    const existingReg = await Registration.findOne({
      event: eventId,
      user:  req.user._id,
      status: "confirmed",
    });
    if (existingReg)
      return res.status(409).json({ success: false, message: "You are already registered for this event" });

    // Also check if user already has a seat in any room of this event
    const alreadySeated = event.rooms.some((r) =>
      r.seats.some((s) => s.bookedBy?.toString() === req.user._id.toString())
    );
    if (alreadySeated)
      return res.status(409).json({ success: false, message: "You already have a seat booked for this event" });

    // Validate each requested seat exists and is free
    const targetSeats = seatIds.map((id) => {
      const seat = room.seats.id(id);
      if (!seat)
        throw { status: 404, message: `Seat not found: ${id}` };
      if (seat.occupied)
        throw { status: 409, message: `Seat ${String.fromCharCode(65 + seat.row)}${seat.col + 1} is already taken` };
      return seat;
    });

    // Book seats on the Event document
    const ticketId = genTicket();
    targetSeats.forEach((seat) => {
      seat.occupied     = true;
      seat.bookedBy     = req.user._id;
      seat.bookedByName = req.user.fullName || req.user.name || req.user.email;
      seat.ticketId     = ticketId;
      seat.bookedAt     = now;
    });
    await event.save();

    // Create Registration document (upsert in case of retry)
    const registration = await Registration.findOneAndUpdate(
      { event: eventId, user: req.user._id },
      {
        event:    eventId,
        user:     req.user._id,
        status:   "confirmed",
        roomId:   room._id,
        seatId:   targetSeats[0]._id,   // primary seat
        ticketId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Return booked seat info (safe — user is the booker)
    const bookedSeats = targetSeats.map((s) => ({
      _id:      s._id,
      row:      s.row,
      col:      s.col,
      vip:      s.vip,
      occupied: s.occupied,
      ticketId: s.ticketId,
      seatLabel: `${String.fromCharCode(65 + s.row)}${s.col + 1}`,
    }));

    res.status(201).json({
      success: true,
      message: "Seat booked successfully",
      ticketId,
      roomId:        room._id,
      roomName:      room.name,
      bookedSeats,
      registrationId: registration._id,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/events/:eventId/rooms/:roomId/book/:seatId
// Cancel a booking — only by the booker or the host
// Also cancels the Registration document
// ─────────────────────────────────────────────────────────────────────────────
export const cancelBooking = async (req, res) => {
  try {
    const { eventId, roomId, seatId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const room = event.rooms.id(roomId);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    const seat = room.seats.id(seatId);
    if (!seat)     return res.status(404).json({ success: false, message: "Seat not found" });
    if (!seat.occupied) return res.status(400).json({ success: false, message: "Seat is not booked" });

    const isOwner = seat.bookedBy?.toString() === req.user._id.toString();
    const isHost  = event.createdBy.toString() === req.user._id.toString();
    if (!isOwner && !isHost)
      return res.status(403).json({ success: false, message: "Not authorised to cancel this booking" });

    // Identify who owned this seat before clearing
    const ownerId = seat.bookedBy;

    // Clear seat
    seat.occupied     = false;
    seat.bookedBy     = null;
    seat.bookedByName = null;
    seat.ticketId     = null;
    seat.bookedAt     = null;
    await event.save();

    // Cancel the Registration document for the original owner
    await Registration.findOneAndUpdate(
      { event: eventId, user: ownerId },
      { status: "cancelled" }
    );

    res.json({ success: true, message: "Booking cancelled", seatId, roomId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/:eventId/my-booking
// Returns the logged-in user's booked seat for this event
// ─────────────────────────────────────────────────────────────────────────────
export const getMyBooking = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select("rooms eventName");
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const userId   = req.user._id.toString();
    const bookings = [];

    event.rooms.forEach((room) => {
      room.seats.forEach((seat) => {
        if (seat.bookedBy?.toString() === userId) {
          bookings.push({
            roomId:    room._id,
            roomName:  room.name,
            roomType:  room.type,
            seatId:    seat._id,
            row:       seat.row,
            col:       seat.col,
            vip:       seat.vip,
            ticketId:  seat.ticketId,
            bookedAt:  seat.bookedAt,
            seatLabel: `${String.fromCharCode(65 + seat.row)}${seat.col + 1}`,
          });
        }
      });
    });

    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};