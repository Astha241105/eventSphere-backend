import Registration from "../models/Registration.js";
import Event from "../models/Event.js";

/* ── GET /api/registrations/host
   Returns all registrations grouped by event for the logged-in host.
   Frontend loads this once, then filters by eventId client-side.
─────────────────────────────────────────────────────────────────── */
export const getHostRegistrations = async (req, res) => {
  try {
    // 1. Find all events created by this host
    const hostEvents = await Event.find({ createdBy: req.user.id }).select(
      "_id eventName category mode city venueName eventStart status"
    );

    if (hostEvents.length === 0) {
      return res.status(200).json({ events: [] });
    }

    const eventIds = hostEvents.map((e) => e._id);

    // 2. Fetch all confirmed registrations across those events in one query
    const registrations = await Registration.find({
      event:  { $in: eventIds },
      status: "confirmed",
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    // 3. Group registrations under each event
    const regMap = {};
    registrations.forEach((r) => {
      const eid = r.event.toString();
      if (!regMap[eid]) regMap[eid] = [];
      regMap[eid].push({
        registrationId: r._id,
        userId:         r.user._id,
        name:           r.user.name,
        email:          r.user.email,
        status:         r.status,
        teamName:       r.teamName,
        teamMembers:    r.teamMembers,
        ticketId:       r.ticketId,
        registeredAt:   r.createdAt,
      });
    });

    // 4. Shape the final response
    const events = hostEvents.map((e) => ({
      eventId:     e._id,
      eventName:   e.eventName,
      category:    e.category,
      mode:        e.mode,
      location:    e.city || e.venueName || (e.mode === "online" ? "Online" : "TBD"),
      eventStart:  e.eventStart,
      apiStatus:   e.status,
      attendees:   regMap[e._id.toString()] || [],
    }));

    res.status(200).json({ events });
  } catch (err) {
    console.error("getHostRegistrations error:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── GET /api/registrations/event/:eventId
   Returns attendees for a single event (used when switching events).
─────────────────────────────────────────────────────────────────── */
export const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).select("createdBy eventName");
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    const registrations = await Registration.find({
      event:  eventId,
      status: "confirmed",
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const attendees = registrations.map((r) => ({
      registrationId: r._id,
      userId:         r.user._id,
      name:           r.user.name,
      email:          r.user.email,
      status:         r.status,
      teamName:       r.teamName,
      teamMembers:    r.teamMembers,
      ticketId:       r.ticketId,
      registeredAt:   r.createdAt,
    }));

    res.status(200).json({
      eventId,
      eventName:  event.eventName,
      total:      attendees.length,
      attendees,
    });
  } catch (err) {
    console.error("getEventRegistrations error:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── POST /api/registrations ── */
export const registerForEvent = async (req, res) => {
  try {
    const { eventId, teamName, teamMembers } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const existing = await Registration.findOne({ event: eventId, user: req.user.id });
    if (existing) return res.status(409).json({ message: "Already registered." });

    const registration = await Registration.create({
      event:       eventId,
      user:        req.user.id,
      teamName:    teamName    || null,
      teamMembers: teamMembers || [],
    });

    res.status(201).json({ message: "Registered successfully.", registration });
  } catch (err) {
    console.error("registerForEvent error:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ── DELETE /api/registrations/:registrationId ── */
export const cancelRegistration = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) return res.status(404).json({ message: "Not found." });

    if (registration.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    registration.status = "cancelled";
    await registration.save();

    res.status(200).json({ message: "Registration cancelled." });
  } catch (err) {
    console.error("cancelRegistration error:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};