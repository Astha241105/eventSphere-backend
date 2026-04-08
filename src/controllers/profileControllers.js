import User from "../models/User.js";
import Registration from "../models/Registration.js";

/* =====================================================
   GET PROFILE
===================================================== */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-__v")

    //  .populate("favouriteEvents");

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



/* =====================================================
   GET UPCOMING EVENTS
===================================================== */
export const getUpcomingEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const now = new Date();

    const registrations = await Registration.find({
      userId,
      status: "registered",
    }).populate({
      path: "eventId",
      match: { date: { $gt: now } },
    });

    const events = registrations
      .filter(r => r.eventId !== null)
      .map(r => r.eventId);

    res.json(events);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* =====================================================
   GET PAST EVENTS
===================================================== */
export const getPastEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const now = new Date();

    const registrations = await Registration.find({
      userId,
    }).populate({
      path: "eventId",
      match: { date: { $lt: now } },
    });

    const events = registrations
      .filter(r => r.eventId !== null)
      .map(r => r.eventId);

    res.json(events);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



/* =====================================================
   GET FAVOURITE EVENTS
===================================================== */
export const getFavouriteEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    
    //   .populate("favouriteEvents");

    res.json(user.favouriteEvents);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};