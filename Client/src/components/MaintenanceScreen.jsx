import React, { useState, useEffect } from "react";
import { Settings, Clock, Server, AlertCircle, RefreshCw } from "lucide-react";

const MaintenanceScreen = ({ message, onRetry }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setTimeout(() => setRetrying(false), 2000);
    }
  };

  const statusCards = [
    {
      icon: <Server className="w-5 h-5" />,
      title: "Server Status",
      value: "Under Maintenance",
      color: "text-orange-400",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Expected Duration",
      value: "Brief downtime",
      color: "text-blue-400",
    },
    {
      icon: <AlertCircle className="w-5 h-5" />,
      title: "Impact",
      value: "All services",
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-lg text-center">
        {/* Main Icon */}
        <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/30">
          <Settings className="w-12 h-12 text-orange-400" />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Under Maintenance
        </h1>

        {/* Message */}
        <p className="text-lg text-slate-300 mb-2 max-w-md mx-auto">
          {message ||
            "We're performing scheduled maintenance to improve your experience."}
        </p>
        <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
          Our team is working hard to bring everything back online. Thank you
          for your patience.
        </p>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {statusCards.map((card, index) => (
            <div
              key={index}
              className="p-4 bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-800"
            >
              <div className={`${card.color} mb-2 flex justify-center`}>
                {card.icon}
              </div>
              <p className="text-xs text-slate-400 mb-1">{card.title}</p>
              <p className="text-sm font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Current Time */}
        <div className="mb-8 p-4 bg-slate-900/40 rounded-xl border border-slate-800 inline-block">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div className="text-left">
              <p className="text-xs text-slate-400">Current Time</p>
              <p className="text-lg font-mono text-white">
                {currentTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Retry Button */}
        <div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center gap-3 px-8 py-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg transition-all duration-200"
          >
            <RefreshCw
              className={`w-5 h-5 ${retrying ? "animate-spin" : ""}`}
            />
            {retrying ? "Checking..." : "Check Again"}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            If this persists, please contact support at{" "}
            <a
              href="mailto:support@communiatec.com"
              className="text-cyan-400 hover:underline"
            >
              support@communiatec.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
