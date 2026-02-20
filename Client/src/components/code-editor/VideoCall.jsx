// Client/src/components/code-editor/VideoCall.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SignalIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

// ───────────────────────────────────────────────────────────
// Free public STUN/TURN servers for NAT traversal
// ───────────────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

// ───────────────────────────────────────────────────────────
// Call state enum
// ───────────────────────────────────────────────────────────
const CALL_STATE = {
  IDLE: "idle",
  CALLING: "calling",
  INCOMING: "incoming",
  CONNECTED: "connected",
};

const VideoCall = ({
  codeSocket,
  sessionId,
  currentUserId,
  userInfo,
  isCodeConnected,
  participants,
}) => {
  // ── State ──────────────────────────────────────────────
  const [callState, setCallState] = useState(CALL_STATE.IDLE);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [peerMediaState, setPeerMediaState] = useState({
    audio: true,
    video: true,
  });
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState("good"); // good, fair, poor

  // ── Refs ───────────────────────────────────────────────
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const isNegotiatingRef = useRef(false);
  const remoteDescSetRef = useRef(false);

  // ── Cleanup helper ────────────────────────────────────
  const cleanupCall = useCallback(() => {
    console.log("🧹 Cleaning up WebRTC call...");

    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onnegotiationneeded = null;
      peerConnectionRef.current.onsignalingstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Reset state
    pendingCandidatesRef.current = [];
    isNegotiatingRef.current = false;
    remoteDescSetRef.current = false;
    setCallDuration(0);
    setIncomingCallData(null);
    setPeerMediaState({ audio: true, video: true });
    setIsMuted(false);
    setIsCameraOff(false);
    setConnectionQuality("good");
  }, []);

  // ── Get local media stream ────────────────────────────
  const getLocalStream = useCallback(async () => {
    try {
      // Guard for insecure context / unsupported media APIs (e.g., HTTP)
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        const isSecure = typeof window !== "undefined" && window.isSecureContext;
        const reason = isSecure
          ? "Media devices are unavailable in this browser/session."
          : "getUserMedia requires HTTPS or localhost.";
        toast.error(`${reason} Please open the app over HTTPS and allow camera/mic.`);
        throw new Error("mediaDevices.getUserMedia unavailable");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("❌ Failed to get user media:", error);

      // Try audio-only if video fails
      if (
        error.name === "NotAllowedError" ||
        error.name === "NotFoundError"
      ) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          localStreamRef.current = audioStream;
          setIsCameraOff(true);
          toast.info("Camera not available — using audio only");
          return audioStream;
        } catch (audioError) {
          toast.error(
            "Could not access microphone. Please check your permissions.",
          );
          throw audioError;
        }
      }

      toast.error("Could not access camera/microphone.");
      throw error;
    }
  }, []);

  // ── Create peer connection ────────────────────────────
  const createPeerConnection = useCallback(
    (targetSocketId) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;
      remoteDescSetRef.current = false;

      // Add local tracks to connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log("🎥 Received remote track:", event.track.kind);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE Candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && codeSocket) {
          codeSocket.emit("webrtc-ice-candidate", {
            sessionId,
            targetSocketId: targetSocketId || null,
            candidate: event.candidate,
          });
        }
      };

      // Connection state monitoring
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("🔌 ICE connection state:", state);

        switch (state) {
          case "connected":
          case "completed":
            setConnectionQuality("good");
            break;
          case "checking":
            setConnectionQuality("fair");
            break;
          case "disconnected":
            setConnectionQuality("poor");
            toast.warning("Connection quality is degraded.");
            break;
          case "failed":
            setConnectionQuality("poor");
            toast.error("Connection failed. Ending call.");
            endCall();
            break;
          case "closed":
            break;
          default:
            break;
        }
      };

      pc.onsignalingstatechange = () => {
        console.log("📶 Signaling state:", pc.signalingState);
        isNegotiatingRef.current = pc.signalingState !== "stable";
      };

      return pc;
    },
    [codeSocket, sessionId],
  );

  // ── Flush pending ICE candidates ──────────────────────
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !remoteDescSetRef.current) return;

    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("⚠️ Failed to add buffered ICE candidate:", err);
      }
    }
  }, []);

  // ── Start a call ──────────────────────────────────────
  const startCall = useCallback(
    async (callType = "video") => {
      if (!codeSocket || !isCodeConnected) {
        toast.error("Not connected to session. Cannot start a call.");
        return;
      }

      if (participants.length < 2) {
        toast.warning(
          "You need at least one other participant to start a call.",
        );
        return;
      }

      try {
        setCallState(CALL_STATE.CALLING);

        // Get local media
        await getLocalStream();

        // Notify others in the session
        codeSocket.emit("call-user", {
          sessionId,
          callType,
        });

        toast.info("Calling other participants...");
      } catch (error) {
        console.error("❌ Failed to start call:", error);
        setCallState(CALL_STATE.IDLE);
        cleanupCall();
      }
    },
    [
      codeSocket,
      isCodeConnected,
      sessionId,
      participants,
      getLocalStream,
      cleanupCall,
    ],
  );

  // ── Accept an incoming call ───────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCallData || !codeSocket) return;

    try {
      // Get local media
      await getLocalStream();

      setCallState(CALL_STATE.CONNECTED);

      // Notify the caller
      codeSocket.emit("call-accepted", {
        sessionId,
        callerId: incomingCallData.callerId,
        callerSocketId: incomingCallData.callerSocketId,
      });

      // Start call duration timer
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      toast.success("Call connected!");
    } catch (error) {
      console.error("❌ Failed to accept call:", error);
      setCallState(CALL_STATE.IDLE);
      cleanupCall();
    }
  }, [incomingCallData, codeSocket, sessionId, getLocalStream, cleanupCall]);

  // ── Reject an incoming call ───────────────────────────
  const rejectCall = useCallback(() => {
    if (!incomingCallData || !codeSocket) return;

    codeSocket.emit("call-rejected", {
      sessionId,
      callerId: incomingCallData.callerId,
      callerSocketId: incomingCallData.callerSocketId,
    });

    setCallState(CALL_STATE.IDLE);
    setIncomingCallData(null);
    toast.info("Call rejected.");
  }, [incomingCallData, codeSocket, sessionId]);

  // ── End the call ──────────────────────────────────────
  const endCall = useCallback(() => {
    if (codeSocket) {
      codeSocket.emit("call-ended", { sessionId });
    }

    cleanupCall();
    setCallState(CALL_STATE.IDLE);
    toast.info("Call ended.");
  }, [codeSocket, sessionId, cleanupCall]);

  // ── Toggle mute ───────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      const newMuted = !isMuted;
      setIsMuted(newMuted);

      if (codeSocket) {
        codeSocket.emit("toggle-media", {
          sessionId,
          mediaType: "audio",
          enabled: !newMuted,
        });
      }
    }
  }, [isMuted, codeSocket, sessionId]);

  // ── Toggle camera ─────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => {
          track.enabled = !track.enabled;
        });
        const newCameraOff = !isCameraOff;
        setIsCameraOff(newCameraOff);

        if (codeSocket) {
          codeSocket.emit("toggle-media", {
            sessionId,
            mediaType: "video",
            enabled: !newCameraOff,
          });
        }
      }
    }
  }, [isCameraOff, codeSocket, sessionId]);

  // ── Socket event listeners ────────────────────────────
  useEffect(() => {
    if (!codeSocket) return;

    // Incoming call notification
    const onIncomingCall = (data) => {
      console.log("📞 Incoming call from:", data.callerInfo?.firstName);

      // Don't show if we're already in a call
      if (callState === CALL_STATE.CONNECTED) return;

      setIncomingCallData(data);
      setCallState(CALL_STATE.INCOMING);
    };

    // Call accepted
    const onCallAccepted = async (data) => {
      console.log("✅ Call accepted by:", data.acceptorInfo?.firstName);

      setCallState(CALL_STATE.CONNECTED);

      // Start call timer
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // As the caller, create the peer connection and send an offer
      try {
        const pc = createPeerConnection(data.acceptorSocketId);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        codeSocket.emit("webrtc-offer", {
          sessionId,
          targetSocketId: data.acceptorSocketId,
          offer: pc.localDescription,
        });

        toast.success(
          `${data.acceptorInfo?.firstName || "User"} joined the call!`,
        );
      } catch (error) {
        console.error("❌ Failed to create offer:", error);
        endCall();
      }
    };

    // Call rejected
    const onCallRejected = (data) => {
      console.log("❌ Call rejected by:", data.rejectorInfo?.firstName);
      toast.info(
        `${data.rejectorInfo?.firstName || "User"} declined the call.`,
      );

      // Only go idle if we're not connected yet
      if (callState !== CALL_STATE.CONNECTED) {
        cleanupCall();
        setCallState(CALL_STATE.IDLE);
      }
    };

    // Call ended by peer
    const onCallEnded = () => {
      console.log("📴 Call ended by peer.");
      cleanupCall();
      setCallState(CALL_STATE.IDLE);
      toast.info("The other participant ended the call.");
    };

    // WebRTC Offer received
    const onWebRTCOffer = async (data) => {
      console.log("📡 Received WebRTC offer from:", data.callerSocketId);

      try {
        const pc = createPeerConnection(data.callerSocketId);

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        remoteDescSetRef.current = true;

        // Flush any candidates that arrived before the remote description
        await flushPendingCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        codeSocket.emit("webrtc-answer", {
          sessionId,
          targetSocketId: data.callerSocketId,
          answer: pc.localDescription,
        });
      } catch (error) {
        console.error("❌ Failed to handle offer:", error);
      }
    };

    // WebRTC Answer received
    const onWebRTCAnswer = async (data) => {
      console.log("📡 Received WebRTC answer from:", data.answererSocketId);

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
          remoteDescSetRef.current = true;
          await flushPendingCandidates();
        } else {
          console.warn(
            "⚠️ Received answer but signaling state is:",
            pc.signalingState,
          );
        }
      } catch (error) {
        console.error("❌ Failed to handle answer:", error);
      }
    };

    // ICE Candidate received
    const onICECandidate = async (data) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (remoteDescSetRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          // Buffer candidates that arrive before remote description
          pendingCandidatesRef.current.push(data.candidate);
        }
      } catch (error) {
        console.warn("⚠️ Failed to add ICE candidate:", error);
      }
    };

    // Peer media toggle
    const onPeerMediaToggle = (data) => {
      setPeerMediaState((prev) => ({
        ...prev,
        [data.mediaType]: data.enabled,
      }));
    };

    // Register event listeners
    codeSocket.on("incoming-call", onIncomingCall);
    codeSocket.on("call-accepted", onCallAccepted);
    codeSocket.on("call-rejected", onCallRejected);
    codeSocket.on("call-ended", onCallEnded);
    codeSocket.on("webrtc-offer", onWebRTCOffer);
    codeSocket.on("webrtc-answer", onWebRTCAnswer);
    codeSocket.on("webrtc-ice-candidate", onICECandidate);
    codeSocket.on("peer-media-toggle", onPeerMediaToggle);

    return () => {
      codeSocket.off("incoming-call", onIncomingCall);
      codeSocket.off("call-accepted", onCallAccepted);
      codeSocket.off("call-rejected", onCallRejected);
      codeSocket.off("call-ended", onCallEnded);
      codeSocket.off("webrtc-offer", onWebRTCOffer);
      codeSocket.off("webrtc-answer", onWebRTCAnswer);
      codeSocket.off("webrtc-ice-candidate", onICECandidate);
      codeSocket.off("peer-media-toggle", onPeerMediaToggle);
    };
  }, [
    codeSocket,
    sessionId,
    callState,
    createPeerConnection,
    cleanupCall,
    endCall,
    flushPendingCandidates,
  ]);

  // ── Cleanup on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // ── Format duration ───────────────────────────────────
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Connection quality indicator ──────────────────────
  const qualityColor = {
    good: "text-emerald-400",
    fair: "text-amber-400",
    poor: "text-red-400",
  };

  // ───────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* ── INCOMING CALL OVERLAY ─────────────────────── */}
      <AnimatePresence>
        {callState === CALL_STATE.INCOMING && incomingCallData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-cyan-500/10"
              initial={{ y: 30 }}
              animate={{ y: 0 }}
            >
              {/* Pulsing ring */}
              <div className="relative flex items-center justify-center mb-6">
                <motion.div
                  className="absolute w-24 h-24 rounded-full border-2 border-cyan-500/30"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute w-20 h-20 rounded-full border-2 border-emerald-500/30"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                  <PhoneIcon className="w-7 h-7 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white text-center mb-1">
                Incoming{" "}
                {incomingCallData.callType === "audio" ? "Voice" : "Video"} Call
              </h3>
              <p className="text-slate-400 text-center text-sm mb-8">
                {incomingCallData.callerInfo?.firstName || "A participant"} is
                calling you...
              </p>

              <div className="flex items-center justify-center gap-6">
                {/* Reject */}
                <motion.button
                  onClick={rejectCall}
                  className="w-14 h-14 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 flex items-center justify-center transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <PhoneXMarkIcon className="w-6 h-6 text-red-400" />
                </motion.button>

                {/* Accept */}
                <motion.button
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(16, 185, 129, 0.3)",
                      "0 0 30px rgba(16, 185, 129, 0.5)",
                      "0 0 0px rgba(16, 185, 129, 0.3)",
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <PhoneIcon className="w-7 h-7 text-white" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CALL PANEL ───────────────────────────── */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/5 overflow-hidden relative">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-10 -top-10 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl" />
          <div className="absolute -left-5 -bottom-5 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl" />
        </div>

        {/* Header */}
        <div className="p-4 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <VideoCameraIcon className="w-4 h-4 text-cyan-400" />
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent font-bold text-sm">
                Voice & Video
              </span>
            </h3>

            {callState === CALL_STATE.CONNECTED && (
              <div className="flex items-center gap-2">
                {/* Connection quality */}
                <div
                  className={`flex items-center gap-1 text-xs ${qualityColor[connectionQuality]}`}
                >
                  <SignalIcon className="w-3 h-3" />
                </div>

                {/* Duration */}
                <span className="text-xs text-slate-400 font-mono bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/50">
                  {formatDuration(callDuration)}
                </span>

                {/* Expand */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 text-slate-400 hover:text-cyan-400 transition-colors rounded"
                >
                  {isExpanded ? (
                    <ArrowsPointingInIcon className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── IDLE STATE ── */}
          {callState === CALL_STATE.IDLE && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <p className="text-xs text-slate-500 text-center">
                Start a voice or video call with your collaborators
              </p>
              <div className="flex gap-2">
                {/* Voice call */}
                <motion.button
                  onClick={() => startCall("audio")}
                  disabled={!isCodeConnected || participants.length < 2}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800/60 hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/50 hover:border-emerald-500/30 rounded-lg text-slate-300 hover:text-emerald-400 transition-all duration-200 text-sm"
                  whileHover={
                    isCodeConnected && participants.length >= 2
                      ? { scale: 1.02 }
                      : {}
                  }
                  whileTap={
                    isCodeConnected && participants.length >= 2
                      ? { scale: 0.98 }
                      : {}
                  }
                >
                  <MicrophoneIcon className="w-4 h-4" />
                  <span>Voice</span>
                </motion.button>

                {/* Video call */}
                <motion.button
                  onClick={() => startCall("video")}
                  disabled={!isCodeConnected || participants.length < 2}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg text-cyan-300 hover:text-cyan-200 transition-all duration-200 text-sm"
                  whileHover={
                    isCodeConnected && participants.length >= 2
                      ? { scale: 1.02 }
                      : {}
                  }
                  whileTap={
                    isCodeConnected && participants.length >= 2
                      ? { scale: 0.98 }
                      : {}
                  }
                >
                  <VideoCameraIcon className="w-4 h-4" />
                  <span>Video</span>
                </motion.button>
              </div>
              {participants.length < 2 && (
                <p className="text-[10px] text-slate-600 text-center">
                  Waiting for another participant to join...
                </p>
              )}
            </motion.div>
          )}

          {/* ── CALLING STATE ── */}
          {callState === CALL_STATE.CALLING && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex flex-col items-center py-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center mb-3"
                >
                  <PhoneIcon className="w-5 h-5 text-cyan-400" />
                </motion.div>
                <p className="text-sm text-slate-300">Calling...</p>
                <p className="text-xs text-slate-500">
                  Waiting for someone to answer
                </p>
              </div>
              <motion.button
                onClick={endCall}
                className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <PhoneXMarkIcon className="w-4 h-4" />
                Cancel
              </motion.button>
            </motion.div>
          )}

          {/* ── CONNECTED STATE ── */}
          {callState === CALL_STATE.CONNECTED && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Video containers */}
              <div
                className={`relative rounded-lg overflow-hidden bg-slate-950 border border-slate-700/50 ${isExpanded ? "aspect-video" : "aspect-[4/3]"}`}
              >
                {/* Remote video (main) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Fallback if no remote video */}
                {!peerMediaState.video && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <UserCircleIcon className="w-16 h-16 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Camera is off</p>
                    </div>
                  </div>
                )}

                {/* Peer audio muted indicator */}
                {!peerMediaState.audio && (
                  <div className="absolute top-2 right-2 bg-red-500/80 rounded-full p-1.5">
                    <SpeakerXMarkIcon className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Local video (PIP) */}
                <div className="absolute bottom-2 right-2 w-24 h-18 rounded-lg overflow-hidden border-2 border-slate-600/50 shadow-lg bg-slate-950">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {isCameraOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                      <VideoCameraSlashIcon className="w-5 h-5 text-slate-500" />
                    </div>
                  )}

                  {isMuted && (
                    <div className="absolute top-1 right-1 bg-red-500/80 rounded-full p-0.5">
                      <SpeakerXMarkIcon className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Call controls */}
              <div className="flex items-center justify-center gap-3">
                {/* Mute */}
                <motion.button
                  onClick={toggleMute}
                  className={`p-2.5 rounded-full transition-all duration-200 border ${
                    isMuted
                      ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                      : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <SpeakerXMarkIcon className="w-4 h-4" />
                  ) : (
                    <MicrophoneIcon className="w-4 h-4" />
                  )}
                </motion.button>

                {/* Camera toggle */}
                <motion.button
                  onClick={toggleCamera}
                  className={`p-2.5 rounded-full transition-all duration-200 border ${
                    isCameraOff
                      ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                      : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isCameraOff ? (
                    <VideoCameraSlashIcon className="w-4 h-4" />
                  ) : (
                    <VideoCameraIcon className="w-4 h-4" />
                  )}
                </motion.button>

                {/* End call */}
                <motion.button
                  onClick={endCall}
                  className="p-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="End Call"
                >
                  <PhoneXMarkIcon className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
