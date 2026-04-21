import Event from "../models/Event.js";

export const getRoomStatus = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const now = new Date();

    // Adjust field names to match your Event model schema
    const startTime = new Date(event.date || event.startDate || event.startTime);
    const endTime = new Date(event.endDate || event.endTime || startTime.getTime() + 60 * 60 * 1000);

    // Allow joining 10 minutes early
    const joinWindowStart = new Date(startTime.getTime() - 10 * 60 * 1000);

    const isActive = now >= joinWindowStart && now <= endTime;
    const isUpcoming = now < joinWindowStart;
    const isEnded = now > endTime;

    return res.json({
      eventId,
      eventTitle: event.title || event.name,
      isActive,
      isUpcoming,
      isEnded,
      startTime,
      endTime,
      minutesUntilStart: isUpcoming
        ? Math.ceil((joinWindowStart - now) / 60000)
        : 0,
    });
  } catch (err) {
    console.error("Room status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getRoomParticipants = (roomStore) => async (req, res) => {
  const { eventId } = req.params;
  const participants = roomStore.get(eventId) || [];
  res.json({ eventId, count: participants.length, participants });
};