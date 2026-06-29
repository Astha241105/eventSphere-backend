export default function setupSignaling(io, roomStore) {
  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // ── JOIN ROOM ───────────────────────────────────────────────────────────
    socket.on("join-room", ({ eventId, userId, userName }) => {
      if (!eventId) return;

      socket.join(eventId);

      if (!roomStore.has(eventId)) roomStore.set(eventId, []);
      const room = roomStore.get(eventId);

      const existing = room.find((p) => p.userId === userId);
      if (!existing) {
        room.push({ userId, userName, socketId: socket.id });
      } else {
        existing.socketId = socket.id;
      }

      // Tell everyone else a new peer joined
      socket.to(eventId).emit("user-joined", {
        socketId: socket.id,
        userId,
        userName,
      });

      // Send new user the existing peers so they can initiate offers
      const existingPeers = room
        .filter((p) => p.socketId !== socket.id)
        .map((p) => ({ socketId: p.socketId, userId: p.userId, userName: p.userName }));

      socket.emit("existing-peers", existingPeers);

      console.log(`[Room ${eventId}] ${userName} joined (${room.length} total)`);
    });

    // ── WebRTC OFFER ──────────────────────────────────────────────────────────
    socket.on("offer", ({ to, offer, from }) => {
      io.to(to).emit("offer", { from, offer });
    });

    // ── WebRTC ANSWER ─────────────────────────────────────────────────────────
    socket.on("answer", ({ to, answer, from }) => {
      io.to(to).emit("answer", { from, answer });
    });

    // ── ICE CANDIDATE ─────────────────────────────────────────────────────────
    socket.on("ice-candidate", ({ to, candidate, from }) => {
      io.to(to).emit("ice-candidate", { from, candidate });
    });

    // ── MIC / CAMERA TOGGLE broadcast ─────────────────────────────────────────
    socket.on("media-toggle", ({ eventId, userId, type, enabled }) => {
      socket.to(eventId).emit("peer-media-toggle", { userId, type, enabled });
    });

    // ── SCREEN SHARE ──────────────────────────────────────────────────────────
    socket.on("screen-share-start", ({ eventId, userId }) => {
      socket.to(eventId).emit("peer-screen-share", { userId, sharing: true });
    });
    socket.on("screen-share-stop", ({ eventId, userId }) => {
      socket.to(eventId).emit("peer-screen-share", { userId, sharing: false });
    });

    // ── IN-ROOM CHAT ──────────────────────────────────────────────────────────
    socket.on("chat-message", ({ eventId, userId, userName, message }) => {
      io.to(eventId).emit("chat-message", {
        userId,
        userName,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on("disconnecting", () => {
      for (const [eventId, participants] of roomStore.entries()) {
        const idx = participants.findIndex((p) => p.socketId === socket.id);
        if (idx !== -1) {
          const [leaving] = participants.splice(idx, 1);
          socket.to(eventId).emit("user-left", {
            socketId: socket.id,
            userId: leaving.userId,
            userName: leaving.userName,
          });
          console.log(`[Room ${eventId}] ${leaving.userName} left`);
          if (participants.length === 0) roomStore.delete(eventId);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });
}