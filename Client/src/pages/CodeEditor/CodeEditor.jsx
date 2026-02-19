// Client/src/pages/CodeEditor/CodeEditor.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/store";
import { useSocket } from "@/context/SocketContext";
import MonacoEditor from "../../components/code-editor/MonacoEditor";
import LiveUsers from "../../components/code-editor/LiveUsers";
import VideoCall from "../../components/code-editor/VideoCall";
import LoginModal from "./LoginModal";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  CodeBracketIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BoltIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import apiClient from "../../lib/apiClient";

const CodeEditor = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { userInfo } = useStore();
  const {
    initializeCodeSocket,
    disconnectCodeSocket,
    emitCode,
    codeConnectionState,
  } = useSocket();
  const currentUserId = (userInfo?.id || userInfo?._id)?.toString();

  // Socket and connection states
  const [codeSocket, setCodeSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const isConnected = socketConnected && codeConnectionState === "connected";

  // Session and editor states
  const [sessionData, setSessionData] = useState(null);
  const [code, setCode] = useState(
    '// Welcome to Communiatec Code Collaboration\n// Start coding together!\nconsole.log("Hello, World!");',
  );
  const [language, setLanguage] = useState("javascript");
  const [participants, setParticipants] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());

  // UI states
  const [showLoginModal, setShowLoginModal] = useState(!userInfo);
  const [showCreateSession, setShowCreateSession] = useState(!sessionId);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Refs for managing updates
  const lastRemoteUpdate = useRef(0);
  const isUpdatingFromRemote = useRef(false);
  const sessionJoinedRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Initialize code collaboration socket
  useEffect(() => {
    if (userInfo && sessionId) {
      console.log("🔌 Initializing code socket for session:", sessionId);

      const socket = initializeCodeSocket(sessionId);
      if (socket) {
        // CRITICAL: Set up event listeners IMMEDIATELY before any async operations
        setupCodeSocketEvents(socket);
        setCodeSocket(socket);
      }

      return () => {
        console.log("🧹 Cleaning up code socket...");
        disconnectCodeSocket();
        sessionJoinedRef.current = false;
        setCodeSocket(null);
      };
    }
  }, [userInfo, sessionId]);

  // Update socket state when connection state changes to force re-render
  useEffect(() => {
    if (codeSocket) {
      const socketIsConnected = codeSocket.connected;
      const stateIsConnected = codeConnectionState === "connected";

      console.log("🔄 Connection state changed:", {
        codeConnectionState,
        socketConnected: socketIsConnected,
        sessionJoined: sessionJoinedRef.current,
        finalIsConnected: socketIsConnected && stateIsConnected,
      });

      // Update connected state based on actual socket
      setSocketConnected(socketIsConnected);
    }
  }, [codeConnectionState, codeSocket]);

  const setupCodeSocketEvents = (socket) => {
    // Remove any existing listeners to prevent duplicates
    socket.off("session-joined");
    socket.off("error");
    socket.off("code-update");
    socket.off("participants-update");
    socket.off("user-joined");
    socket.off("user-left");
    socket.off("cursor-update");
    socket.off("user-typing");
    socket.off("language-update");
    socket.off("pong");
    socket.off("code-ack");
    socket.off("connect");
    socket.off("disconnect");

    // Monitor socket connection state changes
    const onConnect = () => {
      console.log("✅ Code socket connected event received in component");
      console.log("✅ Socket.connected:", socket.connected);
      // Update connection state
      setSocketConnected(true);

      // Show reconnection success if this isn't the initial connection
      if (sessionJoinedRef.current) {
        toast.success("Reconnected to collaboration session!");
      }
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on("connect", onConnect);
    }

    socket.on("disconnect", (reason) => {
      console.log("❌ Code socket disconnected in component:", reason);
      // Update connection state
      setSocketConnected(false);
      sessionJoinedRef.current = false;

      // Show user-friendly message based on disconnect reason
      if (reason === "io server disconnect") {
        toast.error(
          "Disconnected from server. Your changes may not be synced.",
        );
      } else if (reason === "transport close" || reason === "transport error") {
        toast.warning("Connection interrupted. Attempting to reconnect...");
      }
    });

    // Track our own socket ID for filtering updates
    let mySocketId = socket.id;

    // Session events
    socket.on("session-joined", (data) => {
      console.log("🎯 Successfully joined session:", data);
      console.log("📝 Received code length:", data.code?.length);
      console.log("🔑 My socket ID from server:", data.mySocketId);
      console.log("👥 Participants count:", data.participants?.length);

      // Store our socket ID from server response for reliable filtering
      if (data.mySocketId) {
        mySocketId = data.mySocketId;
      }

      isUpdatingFromRemote.current = true;
      setCode(data.code || "");
      setLanguage(data.language || "javascript");
      setParticipants(data.participants || []);

      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 500);

      // Mark that we've successfully joined the session room on server
      sessionJoinedRef.current = true;
      console.log("✅ Session joined ref set to true");

      toast.success("Successfully joined collaboration session!");
    });

    socket.on("error", (error) => {
      console.error("❌ Session error:", error);
      const errorMsg = error.message || "Session error occurred";
      toast.error(errorMsg);

      // Additional error handling based on error type
      if (errorMsg.includes("Session not found")) {
        console.error("Session does not exist. Redirecting...");
        setTimeout(() => {
          navigate("/code-editor");
        }, 2000);
      } else if (errorMsg.includes("Failed to join")) {
        sessionJoinedRef.current = false;
      }
    });

    // Real-time collaboration events
    socket.on("code-update", (data) => {
      console.log("📝 Received code update:", {
        fromUserId: data.userId,
        fromSocketId: data.socketId,
        myUserId: currentUserId,
        mySocketId: mySocketId,
        socketId: socket.id,
        codeLength: data.code?.length,
      });

      // CRITICAL: Server now uses socket.to() so we should NOT receive our own updates
      // But keep the filter as a safety measure
      const isFromMe =
        (data.userId &&
          currentUserId &&
          data.userId.toString() === currentUserId.toString()) ||
        (data.socketId &&
          (data.socketId === mySocketId || data.socketId === socket.id));

      if (!isFromMe) {
        console.log("✅ Applying remote code update from another user");
        isUpdatingFromRemote.current = true;
        lastRemoteUpdate.current = data.timestamp || Date.now();
        setCode(data.code || "");

        setTimeout(() => {
          isUpdatingFromRemote.current = false;
        }, 200);
      } else {
        // This should rarely happen now that server uses socket.to()
        console.log(
          "⏭️ Skipping own code update (shouldn't happen with server fix)",
        );
      }
    });

    socket.on("participants-update", (newParticipants) => {
      console.log("👥 Participants updated:", newParticipants);
      setParticipants(newParticipants || []);
    });

    socket.on("user-joined", (user) => {
      console.log("👋 User joined:", user.username);
      toast.success(`${user.username} joined the session`);
    });

    socket.on("user-left", (data) => {
      console.log("👋 User left:", data.userId);
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    socket.on("cursor-update", (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === data.userId ? { ...p, cursor: data.position } : p,
        ),
      );
    });

    socket.on("user-typing", (data) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    socket.on("language-update", (data) => {
      setLanguage(data.language);
      toast.info(`Language changed to ${data.language}`);
    });

    // Health check
    socket.on("pong", (data) => {
      console.log("🏓 Code socket health check OK", data);
    });

    // Server acknowledgement for debug
    socket.on("code-ack", (ack) => {
      console.log("📨 Server acknowledged code-change:", ack);
    });

    // Handle session info response (used for reconnection sync)
    socket.on("session-info", async (data) => {
      console.log("🔄 Received session info after reconnection:", data);
      // Reload session data to ensure we have the latest code
      if (sessionId && sessionData) {
        try {
          const response = await apiClient.get(`/api/code/join/${sessionId}`);
          if (response.data.success) {
            console.log("✅ Synced latest session data after reconnection");
            isUpdatingFromRemote.current = true;
            setCode(response.data.session.code || "");
            setLanguage(response.data.session.language || "javascript");
            setParticipants(response.data.session.participants || []);
            setTimeout(() => {
              isUpdatingFromRemote.current = false;
            }, 300);
          }
        } catch (error) {
          console.error("Failed to sync session after reconnection:", error);
        }
      }
    });
  };

  // Load session data
  useEffect(() => {
    if (sessionId && userInfo) {
      loadSession();
    }
  }, [sessionId, userInfo]);

  const loadSession = async () => {
    try {
      const response = await apiClient.get(`/api/code/join/${sessionId}`);
      if (response.data.success) {
        const session = response.data.session;
        setSessionData(session);

        // Only set initial code if socket hasn't loaded it yet
        if (!isConnected) {
          setCode(session.code || "");
          setLanguage(session.language || "javascript");
        }

        setShowCreateSession(false);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load session");
    }
  };

  const createNewSession = async () => {
    if (!newSessionTitle.trim()) return;

    try {
      const response = await apiClient.post("/api/code/create-session", {
        title: newSessionTitle,
        language: language,
        isPublic: false,
      });

      if (response.data.success) {
        const newSessionId = response.data.session.sessionId;
        navigate(`/code-editor/${newSessionId}`);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("Failed to create session");
    }
  };

  // Handle code changes with proper synchronization
  const handleCodeChange = (newCode, changes, timestamp) => {
    console.log("📝 Local code change detected");
    console.log("📝 Is updating from remote:", isUpdatingFromRemote.current);
    console.log("📝 New code length:", newCode?.length);
    console.log("📝 Socket connected:", isConnected);

    // Skip ONLY if this is a remote update in progress
    if (isUpdatingFromRemote.current) {
      console.log("⏭️ Skipping local change (remote update in progress)");
      return;
    }

    // Don't use aggressive timestamp checking - it blocks too many legitimate updates
    // Just emit the change immediately

    // Ensure we've joined the session room on the server before emitting
    if (!sessionJoinedRef.current) {
      console.warn("⚠️ Not joined to session yet - skipping emit");
      return;
    }

    setCode(newCode);

    // Emit to code socket - check connection state
    const canEmit = isConnected && sessionId && sessionJoinedRef.current;

    if (canEmit) {
      console.log("📡 Emitting code change to server");

      const success = emitCode("code-change", {
        sessionId,
        code: newCode,
        changes,
        userId: currentUserId,
        timestamp: Date.now(),
      });

      if (!success) {
        console.log("⚠️ Failed to emit code change - socket not ready");
      }

      // Handle typing indicators
      emitCode("typing-start", { sessionId });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        emitCode("typing-stop", { sessionId });
      }, 2000);
    } else {
      console.log("⚠️ Cannot emit code change - not connected or no session");
      console.log("⚠️ Socket connected:", socketConnected);
      console.log("⚠️ Connection state:", codeConnectionState);
      console.log("⚠️ Session ID:", sessionId);
      console.log("⚠️ Session joined:", sessionJoinedRef.current);
    }
  };

  const handleCursorChange = (position) => {
    if (isConnected && sessionId && sessionJoinedRef.current) {
      emitCode("cursor-move", {
        sessionId,
        position,
        userId: currentUserId,
      });
    }
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);

    if (isConnected && sessionId && sessionJoinedRef.current) {
      emitCode("language-change", {
        sessionId,
        language: newLanguage,
      });
    }
  };

  const handleLogin = async (loginData) => {
    try {
      const response = await apiClient.post("/auth/login", loginData);
      if (response.data.success) {
        useStore.getState().setUserInfo(response.data.user);
        toast.success("Logged in successfully");
        setShowLoginModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      console.error("Login failed:", error);
    }
  };

  const copySessionLink = () => {
    if (sessionId) {
      const link = `${window.location.origin}/code-editor/${sessionId}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          toast.success("Session link copied to clipboard!");
        })
        .catch(() => {
          toast.error("Failed to copy link to clipboard");
        });
    }
  };

  // Connection health check
  useEffect(() => {
    if (codeSocket && isConnected) {
      const healthCheck = setInterval(() => {
        emitCode("ping");
      }, 30000);

      return () => {
        clearInterval(healthCheck);
      };
    }
  }, [codeSocket, isConnected]);

  // Monitor connection state to refetch session on reconnection
  useEffect(() => {
    if (isConnected && sessionId && sessionJoinedRef.current) {
      console.log("🔄 Connection state changed - refreshing session data...");
      // Small delay to ensure session is properly restored
      const timer = setTimeout(() => {
        loadSession();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, sessionId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
    { value: "typescript", label: "TypeScript" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "json", label: "JSON" },
  ];

  if (!userInfo) {
    return (
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    );
  }

  // Create Session Modal
  if (showCreateSession) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/0 via-cyan-900/5 to-slate-900/0"></div>

          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.slate.800/10)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.slate.800/10)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

          {/* Animated orbs */}
          <motion.div
            className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]"
            animate={{
              x: [0, 60, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]"
            animate={{
              x: [0, -60, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/5 p-8 w-full max-w-md mx-4 z-10 overflow-hidden"
        >
          {/* Corner accents */}
          <div className="absolute top-0 right-0 w-32 h-32">
            <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-md"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-32 h-32">
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-md"></div>
          </div>

          {/* Glowing accents */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent blur-sm"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent blur-sm"></div>

          <motion.div
            className="mx-auto w-16 h-16 bg-slate-800/80 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-slate-700/60 relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-2xl"></div>
            <CodeBracketIcon className="w-8 h-8 text-cyan-400" />
          </motion.div>

          <motion.h2
            className="text-2xl font-bold text-center mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Create Code Session
            </span>
          </motion.h2>

          <motion.p
            className="text-slate-400 text-center mb-8 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Start real-time code collaboration with your team
          </motion.p>

          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="text-slate-300 font-medium text-sm mb-2 block">
                Session Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-slate-800/50 border border-slate-700/50 focus:border-cyan-500/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-800/80 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter session name..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CodeBracketIcon className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="text-slate-300 font-medium text-sm mb-2 block">
                Programming Language
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full appearance-none pl-4 pr-12 py-3.5 bg-slate-800/50 border border-slate-700/50 focus:border-cyan-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-800/80 transition-all duration-300 backdrop-blur-sm"
                >
                  {languages.map((lang) => (
                    <option
                      key={lang.value}
                      value={lang.value}
                      className="bg-slate-800 text-white"
                    >
                      {lang.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDownIcon className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="flex gap-4 pt-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={() => navigate("/chat")}
                className="flex-1 py-3 px-6 rounded-xl font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-all duration-200 border border-slate-700/50 hover:border-slate-600"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={createNewSession}
                disabled={!newSessionTitle.trim()}
                className="flex-1 py-3 px-6 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 relative overflow-hidden group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Shiny effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "mirror",
                    duration: 2,
                    ease: "easeInOut",
                  }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Create Session
                </span>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/0 via-cyan-900/5 to-slate-900/0"></div>

        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.slate.800/10)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.slate.800/10)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

        {/* Animated orbs */}
        <motion.div
          className="absolute -top-60 -left-60 w-[40rem] h-[40rem] bg-cyan-500/5 rounded-full blur-[120px]"
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-[30rem] h-[30rem] bg-emerald-500/5 rounded-full blur-[100px]"
          animate={{
            x: [0, -60, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Header */}
      <motion.div
        className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 relative z-10 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate("/chat")}
              className="p-2.5 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Back to Dashboard"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </motion.button>

            <div>
              <motion.h1
                className="text-xl font-bold text-white flex items-center gap-2.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {sessionData?.title ? (
                  <>
                    <CodeBracketIcon className="w-5 h-5 text-cyan-400" />
                    <span>{sessionData.title}</span>
                  </>
                ) : (
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    CodeSync Studio
                  </span>
                )}
              </motion.h1>
              <motion.div
                className="flex items-center gap-3 text-sm text-slate-400 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{
                      boxShadow: isConnected
                        ? [
                            "0 0 0px #10b981",
                            "0 0 10px #10b981",
                            "0 0 0px #10b981",
                          ]
                        : [
                            "0 0 0px #ef4444",
                            "0 0 10px #ef4444",
                            "0 0 0px #ef4444",
                          ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span>{isConnected ? "Connected" : "Connecting..."}</span>
                </div>

                {sessionId && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/60 rounded-full text-xs border border-slate-700/50 backdrop-blur-sm">
                    <ServerIcon className="w-3 h-3 text-cyan-400" />
                    <span>{sessionId.substring(0, 8)}...</span>
                  </span>
                )}

                {typingUsers.size > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full text-xs border border-emerald-500/20 text-emerald-400 backdrop-blur-sm">
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -2, 0] }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                          className="w-1 h-1 bg-emerald-400 rounded-full"
                        />
                      ))}
                    </div>
                    <span>
                      {typingUsers.size} user{typingUsers.size > 1 ? "s" : ""}{" "}
                      typing
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 bg-slate-800/60 text-white rounded-lg border border-slate-700/50 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm transition-all duration-200 text-sm"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgb(148 163 184)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.5rem center",
                  backgroundSize: "1rem",
                }}
              >
                {languages.map((lang) => (
                  <option
                    key={lang.value}
                    value={lang.value}
                    className="bg-slate-800"
                  >
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Share Button */}
            {sessionId && (
              <motion.button
                onClick={copySessionLink}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 text-sm font-medium relative overflow-hidden group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "mirror",
                    duration: 2,
                    ease: "easeInOut",
                  }}
                />
                <DocumentDuplicateIcon className="w-4 h-4" />
                <span className="relative z-10">Share Link</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex overflow-hidden z-10">
        {/* Code Editor - Always full width */}
        <div
          className={`flex-1 p-5 transition-all duration-300 ${
            !sidebarCollapsed ? "mr-80" : ""
          }`}
        >
          <div className="h-full bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 z-0"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
            <div className="relative z-10 h-full">
              <MonacoEditor
                value={code}
                onChange={handleCodeChange}
                language={language}
                participants={participants}
                onCursorChange={handleCursorChange}
                socket={codeSocket}
                sessionId={sessionId}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Fixed position instead of flex-based layout */}
        <div
          className={`fixed top-[64px] bottom-0 right-0 w-80 bg-slate-900/30 backdrop-blur-lg transition-all duration-300 ease-in-out overflow-auto shadow-xl z-20 ${
            sidebarCollapsed ? "translate-x-full" : "translate-x-0"
          }`}
        >
          <div className="p-5 space-y-4">
            {/* Video / Voice Call */}
            <div>
              <VideoCall
                codeSocket={codeSocket}
                sessionId={sessionId}
                currentUserId={currentUserId}
                userInfo={userInfo}
                isCodeConnected={isConnected}
                participants={participants}
              />
            </div>

            {/* Live Users */}
            <div>
              <LiveUsers
                participants={participants}
                typingUsers={typingUsers}
              />
            </div>

            {/* Connection Status */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/5 overflow-hidden relative">
              {/* Ambient background glow */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl"></div>
              </div>

              <h3 className="text-white font-medium mb-4 flex items-center gap-2 relative z-10">
                <ServerIcon className="w-4 h-4 text-cyan-400" />
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent font-bold">
                  Connection Status
                </span>
              </h3>

              <div className="space-y-2.5 text-sm relative z-10">
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="text-slate-300">Status:</span>
                  <span
                    className={`font-medium flex items-center gap-1.5 ${
                      isConnected ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    <motion.div
                      animate={{
                        boxShadow: isConnected
                          ? [
                              "0 0 0px #10b981",
                              "0 0 6px #10b981",
                              "0 0 0px #10b981",
                            ]
                          : [
                              "0 0 0px #ef4444",
                              "0 0 6px #ef4444",
                              "0 0 0px #ef4444",
                            ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="text-slate-300">Participants:</span>
                  <span className="text-cyan-400 font-medium">
                    {participants.length}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="text-slate-300">Language:</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <CodeBracketIcon className="w-3.5 h-3.5" />
                    {language}
                  </span>
                </div>

                {codeSocket && (
                  <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <span className="text-slate-300">Socket ID:</span>
                    <span className="text-slate-400 text-xs font-mono bg-slate-800/80 py-0.5 px-2 rounded border border-slate-700/50">
                      {codeSocket.id?.substring(0, 10)}...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Debug Info (Remove in production) */}
            {import.meta.env.MODE === "development" && (
              <div className="bg-amber-950/20 backdrop-blur-md rounded-xl p-4 border border-amber-500/20 shadow-lg relative overflow-hidden">
                {/* Ambient background glow */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -left-5 -bottom-5 w-20 h-20 bg-amber-500/5 rounded-full blur-xl"></div>
                </div>

                <h3 className="text-amber-400 font-medium mb-3 flex items-center gap-2 relative z-10">
                  <BoltIcon className="w-4 h-4" />
                  <span>Debug Info</span>
                </h3>

                <div className="space-y-2 text-xs relative z-10">
                  <div className="flex justify-between items-center p-2.5 bg-amber-950/20 rounded-lg border border-amber-900/30">
                    <span className="text-slate-300">Socket Connected:</span>
                    <span
                      className={
                        codeSocket?.connected
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {codeSocket?.connected ? "Yes" : "No"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-amber-950/20 rounded-lg border border-amber-900/30">
                    <span className="text-slate-300">Code Length:</span>
                    <span className="text-amber-300">{code?.length || 0}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-amber-950/20 rounded-lg border border-amber-900/30">
                    <span className="text-slate-300">Last Update:</span>
                    <span className="text-amber-300 font-mono">
                      {lastRemoteUpdate.current
                        ? new Date(lastRemoteUpdate.current).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            },
                          )
                        : "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-amber-950/20 rounded-lg border border-amber-900/30">
                    <span className="text-slate-300">
                      Updating from Remote:
                    </span>
                    <span
                      className={
                        isUpdatingFromRemote.current
                          ? "text-red-400"
                          : "text-emerald-400"
                      }
                    >
                      {isUpdatingFromRemote.current ? "Yes" : "No"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-amber-950/20 rounded-lg border border-amber-900/30">
                    <span className="text-slate-300">Connection State:</span>
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded ${
                        codeConnectionState === "connected"
                          ? "bg-emerald-900/30 text-emerald-400 border border-emerald-900/50"
                          : "bg-amber-900/30 text-amber-400 border border-amber-900/50"
                      }`}
                    >
                      {codeConnectionState}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button - Fixed position */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="fixed right-80 top-1/2 -translate-y-1/2 z-30 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 rounded-l-lg p-3 text-slate-300 hover:text-cyan-400 transition-all shadow-xl"
          style={{
            right: sidebarCollapsed ? "0" : "320px",
          }}
        >
          {sidebarCollapsed ? (
            <ChevronUpIcon className="w-5 h-5 -rotate-90" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 -rotate-90" />
          )}
        </button>
      </div>
    </div>
  );
};

export default CodeEditor;
