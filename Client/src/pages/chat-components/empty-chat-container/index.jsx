import React, { useState } from "react";
import {
  MessageSquare,
  Code,
  Zap,
  ArrowRight,
  Sparkles,
  Shield,
  Globe,
  Layers,
} from "lucide-react";
import DmDialog from "@/pages/chat-components/contacts-dialog-box/index.jsx";
import { useStore } from "@/store/store";

const EmptyChatContainer = () => {
  const [openNewContactModal, setOpenNewContactModal] = useState(false);
  const { setSelectedChatData, setSelectedChatType } = useStore();

  const handleSelectContact = (contact) => {
    setSelectedChatData(contact);
    setSelectedChatType("dm");
  };

  const features = [
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "AI Integration",
      description: "Chat with our AI assistant to get instant answers to your questions.",
      mobileDescription: "Chat with AI assistant",
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30",
      bgColor: "bg-cyan-500/10",
    },
    {
      icon: <Code className="w-5 h-5" />,
      title: "Code Collaboration",
      description: "Share and edit code snippets in real-time with syntax highlighting",
      mobileDescription: "Share code with syntax highlighting",
      color: "text-indigo-400",
      borderColor: "border-indigo-500/30",
      bgColor: "bg-indigo-500/10",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "ZoRo-Vault Cloud Storage",
      description: "Store and access your files securely in the cloud with ZoRo-Vault.",
      mobileDescription: "Store files in the cloud",
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/10",
    },
  ];

  const stats = [
    {
      icon: <Shield className="w-4 h-4" />,
      text: "End-to-End Encrypted",
      mobileText: "Encrypted",
      color: "text-cyan-400",
    },
    {
      icon: <Globe className="w-4 h-4" />,
      text: "Advanced Secured Platform",
      mobileText: "Secured",
      color: "text-blue-400",
    },
    {
      icon: <Layers className="w-4 h-4" />,
      text: "Cloud-Based",
      mobileText: "Cloud",
      color: "text-indigo-400",
    },
  ];

  return (
    <div className="w-full min-h-screen md:h-screen md:flex md:flex-auto bg-slate-950 text-white overflow-hidden relative">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 min-h-screen md:h-full relative z-10">
        <div className="flex flex-col items-center justify-center min-h-screen md:h-full space-y-8 md:space-y-12 py-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4 md:space-y-6 max-w-5xl w-full">
            <div className="relative">
              <div className="absolute -top-2 md:-top-4 left-1/2 transform -translate-x-1/2 w-16 md:w-24 h-0.5 bg-cyan-400/40" />

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-none mb-3 md:mb-4">
                <span className="block text-white/90 mb-1">Welcome to</span>
                <span className="text-cyan-400">Communiatec</span>
              </h1>

              <div className="absolute -bottom-2 md:-bottom-4 left-1/2 transform -translate-x-1/2 w-20 md:w-32 h-0.5 bg-indigo-400/40" />
            </div>

            <div className="space-y-3 md:space-y-4">
              <p className="text-lg md:text-xl lg:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-2 md:px-0">
                Enterprise-grade communication platform for
                <span className="text-cyan-400 font-semibold">
                  {" "}modern teams
                </span>
              </p>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto px-4 md:px-0 leading-relaxed">
                Connect, collaborate, and create with developers worldwide
                <span className="hidden md:inline">
                  {" "}through our next-generation messaging infrastructure
                </span>
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4 md:gap-6 pt-2 md:pt-0">
              <button
                className="group relative inline-flex items-center gap-2 md:gap-3 bg-cyan-600 hover:bg-cyan-700 text-white px-8 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all duration-200 shadow-lg text-base md:text-lg w-full max-w-xs md:max-w-none md:w-auto"
                onClick={() => setOpenNewContactModal(true)}
              >
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-cyan-300" />
                <span>Launch Your Workspace</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>

              <div className="text-xs md:text-sm text-slate-400 flex items-center gap-3">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-cyan-400 rounded-full" />
                  <span>
                    <span className="md:hidden">Instant</span>
                    <span className="hidden md:inline">Instant Setup</span>
                  </span>
                </div>
                <div className="w-px h-3 md:h-4 bg-slate-600" />
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-400 rounded-full" />
                  <span>No Registration</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="w-full max-w-5xl">
            {/* Mobile: Vertical Stack */}
            <div className="md:hidden space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`group bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border ${feature.borderColor} hover:border-opacity-60 transition-all duration-200 shadow-lg`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 ${feature.bgColor} rounded-xl border border-slate-700/30`}>
                      <div className={feature.color}>{feature.icon}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-base font-bold ${feature.color} mb-1`}>
                        {feature.title}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {feature.mobileDescription}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Grid Layout */}
            <div className="hidden md:grid grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`group relative bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border ${feature.borderColor} hover:border-opacity-80 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden hover:-translate-y-1`}
                >
                  <div className="relative z-10 space-y-4">
                    <div className={`p-4 ${feature.bgColor} rounded-2xl w-fit border border-slate-700/30 group-hover:border-opacity-60 transition-all duration-300`}>
                      <div className={feature.color}>{feature.icon}</div>
                    </div>

                    <div className="space-y-1">
                      <h3 className={`text-xl font-bold ${feature.color}`}>
                        {feature.title}
                      </h3>
                      <div className={`w-8 h-0.5 ${feature.bgColor} opacity-60 group-hover:w-12 group-hover:opacity-100 transition-all duration-300`} />
                    </div>

                    <p className="text-slate-400 group-hover:text-slate-300 leading-relaxed transition-colors duration-200 text-sm">
                      {feature.description}
                    </p>
                  </div>

                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-slate-700/30 group-hover:border-cyan-400/40 transition-colors duration-300" />
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 text-xs md:text-sm px-4 md:px-0">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-slate-900/50 backdrop-blur-md rounded-lg md:rounded-xl border border-slate-800 hover:border-slate-700 transition-all duration-200"
              >
                <div className={stat.color}>{stat.icon}</div>
                <span className="text-slate-300 font-medium">
                  <span className="md:hidden">{stat.mobileText}</span>
                  <span className="hidden md:inline">{stat.text}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Professional Badge */}
          <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 bg-slate-900/60 backdrop-blur-xl rounded-xl md:rounded-2xl border border-slate-800 shadow-lg">
            <div className="w-4 h-4 md:w-6 md:h-6 border-2 border-cyan-400 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-cyan-400 rounded-full"></div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400 hidden md:block">
                Ready
              </div>
              <div className="text-xs md:text-sm font-semibold text-cyan-400">
                Professional Communication Suite
              </div>
            </div>
          </div>
        </div>
      </div>

      <DmDialog
        open={openNewContactModal}
        onOpenChange={setOpenNewContactModal}
        onSelectContact={handleSelectContact}
      />
    </div>
  );
};

export default EmptyChatContainer;
