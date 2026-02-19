// Server/socket-handlers/codeSocket.js
const CodeSession = require("../models/CodeSessionModel");

const handleCodeCollaboration = (io) => {
  console.log("🖥️  Setting up code collaboration handlers...");

  // Create a namespace specifically for code collaboration
  const codeNamespace = io.of("/code");

  codeNamespace.on("connection", (socket) => {
    console.log(`🔌 Code collaboration user connected: ${socket.id}`);
    console.log(
      `🔍 Connection details - IP: ${socket.handshake.address}, User-Agent: ${socket.handshake.headers["user-agent"]?.substring(0, 50)}`,
    );

    // Join code session
    socket.on("join-code-session", async (data) => {
      const { sessionId, user } = data;

      if (!sessionId || !user) {
        console.log("❌ Missing sessionId or user data in join-code-session");
        socket.emit("error", { message: "Invalid session or user data" });
        return;
      }

      const userId = (user._id || user.id)?.toString();

      if (!userId) {
        console.log("❌ Could not determine userId from user object:", user);
        socket.emit("error", { message: "User identification failed" });
        return;
      }

      // Set socket properties IMMEDIATELY before any async operations
      socket.userId = userId;
      socket.sessionId = sessionId;
      socket.userInfo = user;

      console.log(
        `👤 User ${userId} (${user.firstName}) joining session: ${sessionId}`,
      );
      console.log(`🔌 Socket ID: ${socket.id}`);

      try {
        // Leave any previous rooms in this namespace (except the socket's own room)
        const currentRooms = Array.from(socket.rooms);
        for (const room of currentRooms) {
          if (room !== socket.id) {
            await socket.leave(room);
            console.log(`🚪 Left previous room: ${room}`);
          }
        }

        // Join the new session room
        await socket.join(sessionId);

        // Verify join was successful
        const roomsAfterJoin = Array.from(socket.rooms);
        console.log(`✅ Socket ${socket.id} rooms after join:`, roomsAfterJoin);

        if (!roomsAfterJoin.includes(sessionId)) {
          console.error(`❌ Failed to join room ${sessionId}`);
          socket.emit("error", { message: "Failed to join session room" });
          return;
        }

        // Get session
        let session = await CodeSession.findOne({ sessionId });
        if (!session) {
          console.log(`❌ Session ${sessionId} not found in database`);
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Generate unique color for user
        const colors = [
          "#FF6B6B",
          "#4ECDC4",
          "#45B7D1",
          "#96CEB4",
          "#FFEAA7",
          "#DDA0DD",
          "#98D8C8",
          "#F7DC6F",
        ];
        const usedColors = session.participants.map((p) => p.color);
        const availableColors = colors.filter(
          (color) => !usedColors.includes(color),
        );
        const userColor =
          availableColors.length > 0
            ? availableColors[0]
            : colors[Math.floor(Math.random() * colors.length)];

        // Add or update participant
        const existingParticipantIndex = session.participants.findIndex(
          (p) => p.userId?.toString() === userId,
        );

        const participantData = {
          userId: userId,
          username: user.firstName || user.username || "Anonymous",
          color: userColor,
          cursor: { line: 1, column: 1 },
          socketId: socket.id, // CRITICAL: Always use the current socket ID
          lastActive: new Date(),
        };

        if (existingParticipantIndex >= 0) {
          // Update existing participant with new socket ID
          session.participants[existingParticipantIndex] = participantData;
        } else {
          // Add new participant
          session.participants.push(participantData);
        }

        session.markModified("participants");
        await session.save();
        console.log(
          `💾 Session saved with ${session.participants.length} participants`,
        );

        // 🔧 FIX: Prepare current participants list
        const currentParticipants = session.participants.map((p) => ({
          userId: p.userId,
          username: p.username,
          color: p.color,
          cursor: p.cursor,
          socketId: p.socketId,
        }));

        // Send current session data to joining user
        socket.emit("session-joined", {
          sessionId: session.sessionId,
          code: session.code,
          language: session.language,
          participants: currentParticipants,
          title: session.title,
          mySocketId: socket.id, // Send back the socket ID so client knows their ID
        });

        // Notify others in the session (not the joining user)
        socket.to(sessionId).emit("user-joined", participantData);

        // Broadcast updated participants list to everyone in the room
        codeNamespace
          .to(sessionId)
          .emit("participants-update", currentParticipants);
        console.log(
          `📢 Broadcasted participants update to room ${sessionId} (${currentParticipants.length} users)`,
        );

        // 🔧 FIX: Get actual room client count
        const socketsInRoom = await codeNamespace.in(sessionId).fetchSockets();
        console.log(
          `🏠 Room ${sessionId} now has ${socketsInRoom.length} connected sockets`,
        );
      } catch (error) {
        console.error(`🚨 Error in join-code-session:`, error);
        socket.emit("error", {
          message: "Failed to join session",
          error: error.message,
        });
      }
    });

    // Handle real-time code changes - CRITICAL FIX
    socket.on("code-change", async (data) => {
      const { sessionId, code, changes, userId, timestamp } = data;

      // Log receipt of incoming code-change for debugging
      console.log("👂 Received code-change from client", {
        fromSocket: socket.id,
        storedSocketUserId: socket.userId,
        storedSocketSessionId: socket.sessionId,
        dataSessionId: sessionId,
        dataUserId: userId,
        codeLength: code ? code.length : 0,
        timestamp,
      });

      try {
        // Validate required data
        if (!sessionId || code === undefined) {
          console.log("❌ Missing sessionId or code in code-change");
          socket.emit("error", { message: "Invalid code change data" });
          return;
        }

        // Verify user is in this session - use stored socket properties
        const effectiveSessionId = socket.sessionId || sessionId;
        const effectiveUserId = socket.userId || userId;

        // If socket doesn't have session info, try to auto-fix
        if (!socket.sessionId || socket.sessionId !== sessionId) {
          console.log(
            `⚠️  User ${userId} trying to edit session they're not in (${socket.sessionId} vs ${sessionId})`,
          );
          // Attempt to auto-fix if session ID matches but socket property isn't set
          if (sessionId) {
            socket.sessionId = sessionId;
            socket.userId = userId;
            await socket.join(sessionId);
            console.log(
              `🔧 Auto-fixed socket session/user ID for ${socket.id}`,
            );
          } else {
            return;
          }
        }

        // Update code in database
        const session = await CodeSession.findOneAndUpdate(
          { sessionId: effectiveSessionId },
          {
            code,
            lastModified: new Date(),
            $inc: { "stats.totalEdits": 1 },
          },
          { new: true },
        );

        if (!session) {
          console.log(
            `❌ Session ${effectiveSessionId} not found for code update`,
          );
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Broadcast to OTHER users in the session (CRITICAL: use socket.to() to exclude sender)
        const updateData = {
          sessionId: effectiveSessionId,
          code,
          changes,
          userId: effectiveUserId,
          socketId: socket.id,
          timestamp: timestamp || Date.now(),
        };

        // CRITICAL FIX: Use socket.to() instead of codeNamespace.to() to exclude the sender
        socket.to(effectiveSessionId).emit("code-update", updateData);

        // Log how many sockets received the broadcast
        const socketsInRoom = await codeNamespace
          .in(effectiveSessionId)
          .fetchSockets();
        const otherSockets = socketsInRoom.filter((s) => s.id !== socket.id);
        console.log(
          `📡 Broadcasted code update to ${otherSockets.length} other socket(s) in room ${sessionId}`,
        );

        // Acknowledge to the sender that the server processed the change
        socket.emit("code-ack", {
          sessionId: effectiveSessionId,
          timestamp: Date.now(),
          success: true,
        });
      } catch (error) {
        console.error("❌ Code change error:", error);
        socket.emit("error", {
          message: "Failed to update code",
          error: error.message,
        });
      }
    });

    // Handle cursor movement
    socket.on("cursor-move", async (data) => {
      const { sessionId, position, userId } = data;

      try {
        const effectiveSessionId = socket.sessionId || sessionId;
        const effectiveUserId = socket.userId || userId;

        if (!effectiveSessionId) {
          console.log(`⚠️  Cursor move: No session ID`);
          return;
        }

        // Update cursor position in database
        await CodeSession.findOneAndUpdate(
          {
            sessionId: effectiveSessionId,
            "participants.userId": effectiveUserId,
          },
          {
            $set: {
              "participants.$.cursor": position,
              "participants.$.lastActive": new Date(),
            },
          },
        );

        // Broadcast cursor position to OTHER users only (use socket.to to exclude sender)
        socket.to(effectiveSessionId).emit("cursor-update", {
          userId: effectiveUserId,
          position,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("❌ Cursor move error:", error);
      }
    });

    // Handle typing indicators
    socket.on("typing-start", (data) => {
      const { sessionId } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (effectiveSessionId) {
        // Broadcast to others only (not the sender)
        socket.to(effectiveSessionId).emit("user-typing", {
          userId: socket.userId,
          isTyping: true,
        });
      }
    });

    socket.on("typing-stop", (data) => {
      const { sessionId } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (effectiveSessionId) {
        // Broadcast to others only (not the sender)
        socket.to(effectiveSessionId).emit("user-typing", {
          userId: socket.userId,
          isTyping: false,
        });
      }
    });

    // Handle language changes
    socket.on("language-change", async (data) => {
      const { sessionId, language } = data;

      try {
        const effectiveSessionId = socket.sessionId || sessionId;
        if (!effectiveSessionId) return;

        await CodeSession.findOneAndUpdate(
          { sessionId: effectiveSessionId },
          { language, lastModified: new Date() },
        );

        // Broadcast to others only (sender already updated locally)
        socket.to(effectiveSessionId).emit("language-update", {
          language,
          userId: socket.userId,
        });

        console.log(
          `🔤 Language changed to ${language} in session ${effectiveSessionId}`,
        );
      } catch (error) {
        console.error("❌ Language change error:", error);
      }
    });

    // Handle user disconnect
    socket.on("disconnect", async (reason) => {
      console.log(`👋 Code user disconnected: ${socket.id}, reason: ${reason}`);
      console.log(`👋 User ID: ${socket.userId}, Session: ${socket.sessionId}`);

      if (socket.userId && socket.sessionId) {
        try {
          // 🔧 FIX: Only remove participant if their socketId matches this socket
          // This prevents removing users who quickly reconnected with a new socket
          const session = await CodeSession.findOneAndUpdate(
            {
              sessionId: socket.sessionId,
              "participants.socketId": socket.id, // Only remove if socket ID matches
            },
            {
              $pull: {
                participants: {
                  socketId: socket.id, // Match by socket ID, not user ID
                },
              },
            },
            { new: true },
          );

          if (session) {
            // Notify other users about disconnection
            socket.to(socket.sessionId).emit("user-left", {
              userId: socket.userId,
              socketId: socket.id,
            });

            // Send updated participants list
            const currentParticipants = session.participants.map((p) => ({
              userId: p.userId,
              username: p.username,
              color: p.color,
              cursor: p.cursor,
              socketId: p.socketId,
            }));

            codeNamespace
              .to(socket.sessionId)
              .emit("participants-update", currentParticipants);
            console.log(
              `🧹 Cleaned up user ${socket.userId} from session ${socket.sessionId}`,
            );
            console.log(
              `🧹 Remaining participants: ${currentParticipants.length}`,
            );
          } else {
            console.log(
              `ℹ️ User ${socket.userId} may have already reconnected with new socket`,
            );
          }
        } catch (error) {
          console.error("❌ Disconnect cleanup error:", error);
        }
      } else {
        console.log(
          `⚠️ Disconnect without user/session info - socket may not have joined properly`,
        );
      }
    });

    // Handle manual leave
    socket.on("leave-session", async (data) => {
      const { sessionId } = data;

      if (socket.sessionId === sessionId) {
        try {
          await socket.leave(sessionId);

          await CodeSession.findOneAndUpdate(
            { sessionId },
            { $pull: { participants: { socketId: socket.id } } },
          );

          socket.to(sessionId).emit("user-left", {
            userId: socket.userId,
            socketId: socket.id,
          });

          console.log(
            `👋 User ${socket.userId} manually left session ${sessionId}`,
          );
        } catch (error) {
          console.error("❌ Leave session error:", error);
        }
      }
    });

    // Connection health check
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // Session info request
    socket.on("get-session-info", async (data) => {
      const { sessionId } = data;

      try {
        const session = await CodeSession.findOne({ sessionId });
        if (session) {
          socket.emit("session-info", {
            sessionId: session.sessionId,
            participantCount: session.participants.length,
            language: session.language,
            lastModified: session.lastModified,
          });
        }
      } catch (error) {
        console.error("❌ Get session info error:", error);
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 📹 WebRTC Signaling Events for Video/Voice Calls
    // ─────────────────────────────────────────────────────────────

    // Initiator sends an offer to start a call
    socket.on("call-user", (data) => {
      const { sessionId, callType } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      console.log(
        `📞 User ${socket.userId} starting ${callType || "video"} call in session ${effectiveSessionId}`,
      );

      // Notify all other users in the session that a call is incoming
      socket.to(effectiveSessionId).emit("incoming-call", {
        callerId: socket.userId,
        callerInfo: socket.userInfo,
        callerSocketId: socket.id,
        callType: callType || "video",
        sessionId: effectiveSessionId,
      });
    });

    // Callee accepts the call
    socket.on("call-accepted", (data) => {
      const { sessionId, callerId, callerSocketId } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      console.log(
        `✅ User ${socket.userId} accepted call from ${callerId} in session ${effectiveSessionId}`,
      );

      // Notify the caller that the call was accepted
      if (callerSocketId) {
        codeNamespace.to(callerSocketId).emit("call-accepted", {
          acceptorId: socket.userId,
          acceptorInfo: socket.userInfo,
          acceptorSocketId: socket.id,
        });
      } else {
        // Fallback: broadcast to session
        socket.to(effectiveSessionId).emit("call-accepted", {
          acceptorId: socket.userId,
          acceptorInfo: socket.userInfo,
          acceptorSocketId: socket.id,
        });
      }
    });

    // Callee rejects the call
    socket.on("call-rejected", (data) => {
      const { sessionId, callerId, callerSocketId } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      console.log(
        `❌ User ${socket.userId} rejected call in session ${effectiveSessionId}`,
      );

      if (callerSocketId) {
        codeNamespace.to(callerSocketId).emit("call-rejected", {
          rejectorId: socket.userId,
          rejectorInfo: socket.userInfo,
        });
      } else {
        socket.to(effectiveSessionId).emit("call-rejected", {
          rejectorId: socket.userId,
          rejectorInfo: socket.userInfo,
        });
      }
    });

    // User ends the call
    socket.on("call-ended", (data) => {
      const { sessionId } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      console.log(
        `📴 User ${socket.userId} ended call in session ${effectiveSessionId}`,
      );

      socket.to(effectiveSessionId).emit("call-ended", {
        userId: socket.userId,
      });
    });

    // WebRTC SDP Offer relay
    socket.on("webrtc-offer", (data) => {
      const { sessionId, targetSocketId, offer } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      console.log(
        `📡 Relaying WebRTC offer from ${socket.id} to ${targetSocketId || "room"}`,
      );

      if (targetSocketId) {
        codeNamespace.to(targetSocketId).emit("webrtc-offer", {
          offer,
          callerSocketId: socket.id,
          callerId: socket.userId,
          callerInfo: socket.userInfo,
        });
      } else {
        socket.to(effectiveSessionId).emit("webrtc-offer", {
          offer,
          callerSocketId: socket.id,
          callerId: socket.userId,
          callerInfo: socket.userInfo,
        });
      }
    });

    // WebRTC SDP Answer relay
    socket.on("webrtc-answer", (data) => {
      const { sessionId, targetSocketId, answer } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      console.log(
        `📡 Relaying WebRTC answer from ${socket.id} to ${targetSocketId || "room"}`,
      );

      if (targetSocketId) {
        codeNamespace.to(targetSocketId).emit("webrtc-answer", {
          answer,
          answererSocketId: socket.id,
          answererId: socket.userId,
          answererInfo: socket.userInfo,
        });
      } else {
        socket.to(effectiveSessionId).emit("webrtc-answer", {
          answer,
          answererSocketId: socket.id,
          answererId: socket.userId,
          answererInfo: socket.userInfo,
        });
      }
    });

    // WebRTC ICE Candidate relay
    socket.on("webrtc-ice-candidate", (data) => {
      const { sessionId, targetSocketId, candidate } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      if (targetSocketId) {
        codeNamespace.to(targetSocketId).emit("webrtc-ice-candidate", {
          candidate,
          senderSocketId: socket.id,
          senderId: socket.userId,
        });
      } else {
        socket.to(effectiveSessionId).emit("webrtc-ice-candidate", {
          candidate,
          senderSocketId: socket.id,
          senderId: socket.userId,
        });
      }
    });

    // Toggle media state notification (mute/unmute, camera on/off)
    socket.on("toggle-media", (data) => {
      const { sessionId, mediaType, enabled } = data;
      const effectiveSessionId = socket.sessionId || sessionId;
      if (!effectiveSessionId) return;

      socket.to(effectiveSessionId).emit("peer-media-toggle", {
        userId: socket.userId,
        userInfo: socket.userInfo,
        mediaType, // "audio" or "video"
        enabled,
      });
    });
  });

  console.log(
    "✅ Code collaboration socket handlers initialized on /code namespace",
  );
  return codeNamespace;
};

module.exports = handleCodeCollaboration;
