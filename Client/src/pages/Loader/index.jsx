import { useState, useEffect } from "react";
import {
  MessageSquare,
  Server,
  Clock,
  Zap,
} from "lucide-react";

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");
  const [tip, setTip] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);

  const tips = [
    "Warming up the servers...",
    "Establishing secure connections...",
    "Loading your conversations...",
    "Preparing your workspace...",
    "Almost there...",
    "Just a few more moments...",
  ];

  const stages = [
    { text: "Connecting to database", color: "text-cyan-400" },
    { text: "Starting server instances", color: "text-blue-400" },
    { text: "Establishing network", color: "text-indigo-400" },
    { text: "Syncing data", color: "text-purple-400" },
    { text: "Loading interface", color: "text-cyan-400" },
  ];

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    const tipInterval = setInterval(() => {
      setTip((prev) => (prev + 1) % tips.length);
    }, 2500);

    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % stages.length);
    }, 4000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCycles((c) => c + 1);
          return 0;
        }
        return prev + 0.33;
      });
    }, 100);

    return () => {
      clearInterval(dotInterval);
      clearInterval(tipInterval);
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Main container */}
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-800">
        {/* Main content */}
        <div className="relative z-10">
          {/* Central icon */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-16 h-16 flex items-center justify-center bg-slate-800/80 rounded-xl border border-slate-700/50">
              <MessageSquare className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-light mb-3 text-white tracking-wide">
              <span className="text-cyan-400 font-medium">CHAT</span>
              <span className="text-slate-300 font-thin"> SYSTEM</span>
            </h2>
            <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm font-mono">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>INITIALIZING{dots}</span>
            </div>
          </div>

          {/* Current stage */}
          <div className="mb-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
            <div className="flex items-center space-x-4">
              <p className="text-white font-medium text-sm tracking-wide">
                {stages[currentStage].text}
              </p>
            </div>
            <div className="flex space-x-1 mt-3">
              {stages.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                    i <= currentStage
                      ? "bg-cyan-400"
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Info cards */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <div className="p-1.5 bg-slate-700/50 rounded-md border border-slate-600/30">
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our server is currently spinning up from sleep mode. This brief pause helps us optimize resources when the app isn't in use.
              </p>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <div className="p-1.5 bg-slate-700/50 rounded-md border border-slate-600/30">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {cycles === 0
                  ? "Hang tight for about 30-60 seconds while we prepare your personalized chat environment."
                  : "The server is taking longer than expected to start. Please continue waiting."}
              </p>
            </div>
          </div>

          {/* Progress section */}
          <div className="space-y-4">
            <div className="relative">
              <div className="flex mb-4 items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-slate-700/50 rounded-md border border-slate-600/30">
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-200 tracking-wide">
                    SYSTEM STATUS
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-light text-cyan-400 font-mono">
                    {Math.min(Math.round(progress), 100)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-slate-800/60 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Status text */}
            <div className="text-center p-4 bg-slate-800/20 rounded-lg border border-slate-700/30">
              <span className="text-slate-300 text-xs font-mono tracking-wider">
                {tips[tip]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;