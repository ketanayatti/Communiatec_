// Client/src/context/SocketContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStore } from "@/store/store.js";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { parseISO, format } from "date-fns";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useRef(null);
  const codeSocket = useRef(null); // Separate socket for code collaboration
  const [connectionState, setConnectionState] = useState("disconnected");
  const [codeConnectionState, setCodeConnectionState] =
    useState("disconnected");

  const {
    userInfo,
    addMessage,
    deleteMessage,
    setDmContacts,
    setGroupContacts,
    setOnlineUsers,
    updateMessageReadStatus,
    setTypingStatus,
    setGroupData,
    updateGroupData,
    removeFromGroup,
  } = useStore();

  // Chat Socket (existing functionality)
  useEffect(() => {
    if (userInfo) {
      // Socket.IO interprets URL paths as namespaces, so we must use
      // only the origin (no path like "/api") for the connection URL.
      const SOCKET_URL =
        typeof window !== "undefined" ? window.location.origin : "";
      socket.current = io(SOCKET_URL, {
        withCredentials: true,
        query: {
          userId: userInfo._id,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
        transports: ["polling", "websocket"],
        upgrade: true,
      });

      // Connection event handlers
      socket.current.on("connect", () => {
        console.log("✅ Connected to chat socket server");
        setConnectionState("connected");
      });

      socket.current.on("disconnect", (reason) => {
        console.log("❌ Disconnected from chat socket server:", reason);
        setConnectionState("disconnected");
      });

      socket.current.on("connect_error", (error) => {
        console.warn("🚨 Chat socket connection error:", error.message);
        setConnectionState("error");
      });

      socket.current.on("reconnect", (attemptNumber) => {
        console.log(
          `✅ Reconnected to chat socket server after ${attemptNumber} attempts`,
        );
        setConnectionState("connected");
      });

      socket.current.on("reconnect_attempt", (attemptNumber) => {
        console.log(`🔄 Chat reconnection attempt ${attemptNumber}...`);
        setConnectionState("reconnecting");
      });

      // Chat event handlers (existing code)
      socket.current.on("onlineUsers", (onlineUsers) => {
        try {
          setOnlineUsers(onlineUsers);
        } catch (error) {
          console.error("Error handling online users update:", error);
        }
      });

      const handleReceiveMessage = (message) => {
        try {
          const { selectedChatType, selectedChatData } = useStore.getState();
          addMessage(message);

          if (message.sender._id !== userInfo._id) {
            let isViewingThisChat = false;

            if (selectedChatType === "dm") {
              isViewingThisChat =
                selectedChatData && selectedChatData._id === message.sender._id;
            } else if (selectedChatType === "group" && message.group) {
              isViewingThisChat =
                selectedChatData && selectedChatData._id === message.group._id;
            }

            if (
              isViewingThisChat &&
              socket.current &&
              socket.current.connected
            ) {
              setTimeout(() => {
                if (selectedChatType === "dm") {
                  socket.current.emit("markMessagesAsRead", {
                    sender: message.sender._id,
                    recipient: userInfo._id,
                  });
                } else if (selectedChatType === "group") {
                  socket.current.emit("groupMessageRead", {
                    groupId: message.group._id,
                    messageId: message._id,
                    userId: userInfo._id,
                  });
                }
              }, 300);
            } else {
              const senderName = message.sender.firstName
                ? `${message.sender.firstName} ${
                    message.sender.lastName || ""
                  }`.trim()
                : "Someone";

              let notificationMsg = "New message received";
              if (message.messageType === "text") {
                notificationMsg = message.group
                  ? `${senderName} in ${message.group.name}: ${message.content}`
                  : `${senderName}: ${message.content}`;
              } else if (message.messageType === "code") {
                notificationMsg = message.group
                  ? `${senderName} sent code in ${message.group.name}`
                  : `${senderName} sent code`;
              }

              toast.info(notificationMsg, { duration: 3000 });
            }
          }
        } catch (error) {
          console.error("Error handling received message:", error);
        }
      };

      socket.current.on("receiveMessage", handleReceiveMessage);
      socket.current.on("groupMessage", handleReceiveMessage);

      socket.current.on("dmListUpdate", (dmList) => {
        try {
          setDmContacts(dmList);
        } catch (error) {
          console.error("Error handling DM list update:", error);
        }
      });

      socket.current.on("groupListUpdate", (groupList) => {
        try {
          setGroupContacts(groupList);
          // If currently viewing a group that no longer exists, close the chat
          const { selectedChatType, selectedChatData, closeChat } =
            useStore.getState();
          if (
            selectedChatType === "group" &&
            selectedChatData &&
            !groupList.some((g) => g._id === selectedChatData._id)
          ) {
            closeChat();
          }
        } catch (error) {
          console.error("Error handling group list update:", error);
        }
      });

      socket.current.on("messageDeleted", ({ messageId }) => {
        try {
          deleteMessage(messageId);
        } catch (error) {
          console.error("Error handling message deletion:", error);
        }
      });

      socket.current.on("typingStatus", ({ sender, isTyping }) => {
        try {
          setTypingStatus(sender, isTyping);
        } catch (error) {
          console.error("Error handling typing status:", error);
        }
      });

      socket.current.on("groupTyping", ({ userId, isTyping }) => {
        try {
          setTypingStatus(userId, isTyping);
        } catch (error) {
          console.error("Error handling group typing status:", error);
        }
      });

      socket.current.on("messagesRead", ({ messageIds, reader }) => {
        try {
          if (Array.isArray(messageIds) && messageIds.length > 0) {
            updateMessageReadStatus(messageIds, true);
          }
        } catch (error) {
          console.error("Error handling read receipts:", error);
        }
      });

      // Listen for newly created calendar events to notify users
      const handleCalendarEventCreated = (event) => {
        try {
          const title = event?.title || "New Event";
          const dateStr = event?.start
            ? format(parseISO(event.start), "PP")
            : "";
          toast.success(`📅 ${title} — ${dateStr}`, { duration: 3000 });
        } catch (error) {
          console.error("Error handling calendar event creation:", error);
        }
      };
      socket.current.on("calendarEventCreated", handleCalendarEventCreated);

      socket.current.on("reactionUpdated", ({ message }) => {
        try {
          // Update message in chat state
          useStore.getState().updateMessageReactions(message);
        } catch (error) {
          console.error("Error updating message reactions:", error);
        }
      });

      // Enhanced Vault notification handlers
      socket.current.on("vaultFileShared", ({ notification, sharedFile }) => {
        try {
          const senderName = notification.data.senderName;
          const fileName = notification.data.fileName;
          const fileSize = notification.data.fileSize;

          // Enhanced notification with better styling and functionality
          toast.success(
            `🎁 File Shared! ${senderName} shared "${fileName}" with you (${(
              fileSize /
              (1024 * 1024)
            ).toFixed(1)} MB)`,
            {
              duration: 6000,
              action: {
                label: "📋 View Files",
                onClick: () => {
                  // Trigger shared files panel open event
                  window.dispatchEvent(new CustomEvent("openSharedFilesPanel"));
                },
              },
              style: {
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                color: "white",
              },
            },
          );

          // Emit event to update shared files count
          window.dispatchEvent(
            new CustomEvent("vaultFileSharedReceived", {
              detail: { sharedFile, notification },
            }),
          );
        } catch (error) {
          console.error("Error handling vault file shared:", error);
        }
      });

      socket.current.on("vaultFileAccepted", ({ fileName, recipientName }) => {
        try {
          // Enhanced acceptance notification
          toast.success(
            `🎉 ${recipientName} accepted your shared file "${fileName}"!`,
            {
              duration: 4000,
              style: {
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "white",
              },
            },
          );
        } catch (error) {
          console.error("Error handling vault file accepted:", error);
        }
      });

      socket.current.on("vaultNotificationCount", ({ count }) => {
        try {
          // Emit event to update notification count
          window.dispatchEvent(
            new CustomEvent("vaultNotificationCountUpdated", {
              detail: { count },
            }),
          );
          console.log("📊 Vault notification count updated:", count);
        } catch (error) {
          console.error("Error handling vault notification count:", error);
        }
      });

      return () => {
        if (socket.current) {
          console.log("🧹 Cleaning up chat socket connection...");
          socket.current.off("receiveMessage", handleReceiveMessage);
          socket.current.off("groupMessage", handleReceiveMessage);
          socket.current.off("messageDeleted");
          socket.current.off("dmListUpdate");
          socket.current.off("groupListUpdate");
          socket.current.off("onlineUsers");
          socket.current.off("typingStatus");
          socket.current.off("groupTyping");
          socket.current.off("messagesRead");
          socket.current.off("groupMessageRead");
          socket.current.off("connect");
          socket.current.off("disconnect");
          socket.current.off("connect_error");
          socket.current.off("reconnect");
          socket.current.off("reconnect_attempt");
          socket.current.off("calendarEventCreated");
          socket.current.off("reactionUpdated");
          socket.current.off("vaultFileShared");
          socket.current.off("vaultFileAccepted");
          socket.current.off("vaultNotificationCount");
          socket.current.disconnect();
          socket.current = null;
          setConnectionState("disconnected");
        }
      };
    }
  }, [userInfo]);

  // Code Collaboration Socket - SEPARATE CONNECTION
  const initializeCodeSocket = (sessionId) => {
    // Check if we already have a connected socket for this session
    if (codeSocket.current && codeSocket.current.connected) {
      const existingSessionId = codeSocket.current.sessionId;
      if (existingSessionId === sessionId) {
        console.log("♻️ Reusing existing code socket for session:", sessionId);
        return codeSocket.current;
      }
      console.log(
        "🧹 Disconnecting existing code socket for different session...",
      );
      codeSocket.current.disconnect();
      codeSocket.current = null;
    }

    if (!userInfo || !sessionId) {
      console.log(
        "⚠️ Cannot initialize code socket - missing userInfo or sessionId",
      );
      return null;
    }

    const userId = (userInfo._id || userInfo.id)?.toString();
    console.log("🔌 Initializing code collaboration socket...");
    console.log("🔌 User ID:", userId);
    console.log("🔌 Session ID:", sessionId);

    // Create connection to /code namespace with forceNew to ensure unique connection
    // Use origin only — getBaseUrl() may return "/api" which Socket.IO
    // would interpret as namespace "/api/code" instead of "/code".
    const SOCKET_URL =
      typeof window !== "undefined" ? window.location.origin : "";
    const codeSocketInstance = io(`${SOCKET_URL}/code`, {
      withCredentials: true,
      auth: {
        token: localStorage.getItem("authToken"),
        userId: userId,
      },
      query: {
        userId: userId,
        sessionId: sessionId,
      },
      transports: ["websocket", "polling"], // Prefer websocket for real-time
      upgrade: true,
      timeout: 20000,
      forceNew: true, // CRITICAL: Always create a new connection
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Store session ID on socket instance for reference
    codeSocketInstance.sessionId = sessionId;

    // 🔧 FIX: Track connection state properly
    let isConnecting = true;
    let hasEmittedJoin = false;

    // 🔧 CRITICAL: Set connecting state FIRST, before any event handlers
    setCodeConnectionState("connecting");

    // Connection events
    const onConnect = () => {
      console.log("✅ Connected to code collaboration server");
      console.log("✅ Socket ID:", codeSocketInstance.id);
      console.log("✅ Socket.connected:", codeSocketInstance.connected);
      isConnecting = false;
      setCodeConnectionState("connected");

      // CRITICAL FIX: Only emit join once, and ensure socket is ready
      if (!hasEmittedJoin && codeSocketInstance.connected) {
        hasEmittedJoin = true;
        console.log(`🎯 Auto-joining session: ${sessionId}`);
        codeSocketInstance.emit("join-code-session", {
          sessionId,
          user: userInfo,
        });
      }
    };

    // Set up connection handler BEFORE checking if connected
    codeSocketInstance.on("connect", onConnect);

    // CRITICAL: Check connection status after a brief delay to ensure socket is initialized
    setTimeout(() => {
      console.log("🔍 Checking socket connection status...");
      console.log("🔍 Socket.connected:", codeSocketInstance.connected);
      console.log("🔍 Socket.id:", codeSocketInstance.id);

      if (codeSocketInstance.connected && isConnecting) {
        console.log("⚡ Socket already connected, calling onConnect manually");
        onConnect();
      }
    }, 50);

    codeSocketInstance.on("disconnect", (reason) => {
      console.log("❌ Code socket disconnected:", reason);
      isConnecting = false;
      setCodeConnectionState("disconnected");
    });

    codeSocketInstance.on("connect_error", (error) => {
      console.error("🚨 Code socket connection error:", error.message);
      isConnecting = false;
      setCodeConnectionState("error");
    });

    codeSocketInstance.on("reconnect", (attemptNumber) => {
      console.log(`✅ Code socket reconnected after ${attemptNumber} attempts`);
      console.log("✅ New Socket ID after reconnect:", codeSocketInstance.id);
      isConnecting = false;
      hasEmittedJoin = false; // Reset for rejoin
      setCodeConnectionState("connected");

      // Rejoin session immediately after reconnect
      if (codeSocketInstance.connected && !hasEmittedJoin) {
        hasEmittedJoin = true;
        console.log(`🔄 Rejoining session after reconnect: ${sessionId}`);
        codeSocketInstance.emit("join-code-session", {
          sessionId,
          user: userInfo,
        });

        // Fetch latest session state after a brief delay
        setTimeout(() => {
          console.log("🔄 Fetching latest session state after reconnection...");
          codeSocketInstance.emit("get-session-info", { sessionId });
        }, 500);
      }
    });

    codeSocketInstance.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Code socket reconnection attempt ${attemptNumber}...`);
      setCodeConnectionState("reconnecting");
    });

    // Store the socket instance
    codeSocket.current = codeSocketInstance;
    return codeSocketInstance;
  };

  const disconnectCodeSocket = () => {
    if (codeSocket.current) {
      console.log("🧹 Disconnecting code socket...");
      codeSocket.current.disconnect();
      codeSocket.current = null;
      setCodeConnectionState("disconnected");
    }
  };

  // Provide both sockets and helper functions
  const socketValue = {
    // Chat socket
    socket: socket.current,
    connectionState,
    isConnected: connectionState === "connected",
    emit: (event, data) => {
      if (socket.current && socket.current.connected) {
        socket.current.emit(event, data);
      } else {
        console.warn("⚠️ Cannot emit to chat socket - not connected:", event);
      }
    },

    // Code socket
    codeSocket: codeSocket.current,
    codeConnectionState,
    isCodeConnected: codeConnectionState === "connected",
    initializeCodeSocket,
    disconnectCodeSocket,
    emitCode: (event, data) => {
      if (codeSocket.current && codeSocket.current.connected) {
        codeSocket.current.emit(event, data);
        return true;
      } else {
        console.warn("⚠️ Cannot emit to code socket - not connected:", event);
        return false;
      }
    },
  };

  return (
    <SocketContext.Provider value={socketValue}>
      {children}
    </SocketContext.Provider>
  );
};
