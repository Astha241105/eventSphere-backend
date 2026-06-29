import Team        from "../models/Team.js";
import TeamPool    from "../models/TeamPool.js";
import TeamRequest from "../models/TeamRequest.js";
import Event       from "../models/Event.js";

/* ── helpers ─────────────────────────────────────────────────── */
const getUserId = (req) => req.user.id;

/* ═══════════════════════════════════════════════════════════════
   TEAMS
═══════════════════════════════════════════════════════════════ */

/* POST /api/teams
   Create a team. Removes creator from pool if they were in it.  */
export const createTeam = async (req, res) => {
  try {
    const { eventId, name } = req.body;
    const userId = getUserId(req);

    const event = await Event.findById(eventId).select("maxTeamSize category");
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (event.category !== "Hackathon")
      return res.status(400).json({ message: "Teams are only for Hackathon events." });

    // Check user is not already in a team for this event
    const existing = await Team.findOne({ event: eventId, members: userId });
    if (existing)
      return res.status(409).json({ message: "You are already in a team for this event." });

    const team = await Team.create({
      event:   eventId,
      name,
      leader:  userId,
      members: [userId],
      maxSize: event.maxTeamSize,
    });

    // Remove from pool if present
    await TeamPool.deleteOne({ event: eventId, user: userId });

    const populated = await team.populate("members", "name email");
    res.status(201).json({ message: "Team created.", team: populated });
  } catch (err) {
    console.error("createTeam:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* GET /api/teams/event/:eventId
   List all open teams for an event with member count.           */
export const getEventTeams = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = getUserId(req);

    const teams = await Team.find({ event: eventId })
      .populate("leader",  "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    // Attach whether current user has a pending request for each team
    const requests = await TeamRequest.find({
      event:  eventId,
      from:   userId,
      status: "pending",
    }).select("team");

    const requestedTeamIds = new Set(requests.map((r) => r.team.toString()));

    const result = teams.map((t) => ({
      _id:          t._id,
      name:         t.name,
      leader:       t.leader,
      members:      t.members,
      memberCount:  t.members.length,
      maxSize:      t.maxSize,
      isOpen:       t.isOpen,
      isFull:       t.members.length >= t.maxSize,
      isMyTeam:     t.members.some((m) => m._id.toString() === userId),
      hasRequested: requestedTeamIds.has(t._id.toString()),
    }));

    res.status(200).json({ teams: result });
  } catch (err) {
    console.error("getEventTeams:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* GET /api/teams/:teamId
   Team detail — members + requests (leader sees statuses).      */
export const getTeamDetail = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = getUserId(req);

    const team = await Team.findById(teamId)
      .populate("leader",  "name email")
      .populate("members", "name email");

    if (!team) return res.status(404).json({ message: "Team not found." });

    const isLeader = team.leader._id.toString() === userId;

    // Leaders see all requests; members see only their own
    const requestFilter = isLeader
      ? { team: teamId }
      : { team: teamId, from: userId };

    const requests = await TeamRequest.find(requestFilter)
      .populate("from", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ team, requests, isLeader });
  } catch (err) {
    console.error("getTeamDetail:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* PATCH /api/teams/:teamId
   Leader updates team name or isOpen.                           */
export const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = getUserId(req);
    const { name, isOpen } = req.body;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found." });
    if (team.leader.toString() !== userId)
      return res.status(403).json({ message: "Only the team leader can update the team." });

    if (name   !== undefined) team.name   = name;
    if (isOpen !== undefined) team.isOpen = isOpen;
    await team.save();

    res.status(200).json({ message: "Team updated.", team });
  } catch (err) {
    console.error("updateTeam:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   POOL
═══════════════════════════════════════════════════════════════ */

/* POST /api/teams/pool/:eventId — join pool                     */
export const joinPool = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = getUserId(req);

    // Must not already be in a team
    const inTeam = await Team.findOne({ event: eventId, members: userId });
    if (inTeam)
      return res.status(409).json({ message: "You are already in a team." });

    await TeamPool.create({ event: eventId, user: userId });
    res.status(201).json({ message: "Added to pool." });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Already in pool." });
    console.error("joinPool:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* DELETE /api/teams/pool/:eventId — leave pool                  */
export const leavePool = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = getUserId(req);
    await TeamPool.deleteOne({ event: eventId, user: userId });
    res.status(200).json({ message: "Removed from pool." });
  } catch (err) {
    console.error("leavePool:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* GET /api/teams/pool/:eventId — list pool members              */
export const getPoolMembers = async (req, res) => {
  try {
    const { eventId } = req.params;
    const pool = await TeamPool.find({ event: eventId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ pool: pool.map((p) => ({ userId: p.user._id, name: p.user.name, email: p.user.email, joinedAt: p.createdAt })) });
  } catch (err) {
    console.error("getPoolMembers:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   REQUESTS
═══════════════════════════════════════════════════════════════ */

/* POST /api/teams/:teamId/request — pool member sends request   */
export const sendRequest = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = getUserId(req);

    const team = await Team.findById(teamId).select("event members maxSize isOpen leader");
    if (!team) return res.status(404).json({ message: "Team not found." });
    if (!team.isOpen) return res.status(400).json({ message: "This team is not accepting requests." });
    if (team.members.length >= team.maxSize) return res.status(400).json({ message: "Team is full." });
    if (team.members.some((m) => m.toString() === userId))
      return res.status(409).json({ message: "You are already in this team." });

    // Must be in pool
    const inPool = await TeamPool.findOne({ event: team.event, user: userId });
    if (!inPool)
      return res.status(400).json({ message: "Join the pool before sending requests." });

    const request = await TeamRequest.create({
      team:  teamId,
      event: team.event,
      from:  userId,
    });

    res.status(201).json({ message: "Request sent.", request });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Request already sent to this team." });
    console.error("sendRequest:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* PATCH /api/teams/requests/:requestId — leader accepts/rejects */
export const handleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // "accepted" | "rejected"
    const userId = getUserId(req);

    if (!["accepted", "rejected"].includes(action))
      return res.status(400).json({ message: "Action must be accepted or rejected." });

    const request = await TeamRequest.findById(requestId).populate("team");
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.team.leader.toString() !== userId)
      return res.status(403).json({ message: "Only the team leader can handle requests." });
    if (request.status !== "pending")
      return res.status(400).json({ message: "Request already handled." });

    request.status = action;
    await request.save();

    if (action === "accepted") {
      const team = request.team;
      if (team.members.length >= team.maxSize)
        return res.status(400).json({ message: "Team is full." });

      team.members.push(request.from);
      await team.save();

      // Remove from pool
      await TeamPool.deleteOne({ event: team.event, user: request.from });
    }

    res.status(200).json({ message: `Request ${action}.` });
  } catch (err) {
    console.error("handleRequest:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};

/* DELETE /api/teams/requests/:requestId — requester withdraws   */
export const withdrawRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = getUserId(req);

    const request = await TeamRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.from.toString() !== userId)
      return res.status(403).json({ message: "Access denied." });

    await request.deleteOne();
    res.status(200).json({ message: "Request withdrawn." });
  } catch (err) {
    console.error("withdrawRequest:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
};