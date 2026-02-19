import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useStore } from "@/store/store";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, X } from "lucide-react";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import ResetPassword from "./ResetPassword";
import Globe3D from "@/components/Globe3D";
import ThreeErrorBoundary from "@/components/ThreeErrorBoundary";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const { setUserInfo } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showAuthPanel, setShowAuthPanel] = useState(isMobile);
  const [globeAnimating, setGlobeAnimating] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowAuthPanel(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const token = searchParams.get("token");
    const success = searchParams.get("success");

    if (token && success === "true") {
      localStorage.setItem("authToken", token);
      const expiry = Date.now() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem("authTokenExpiry", expiry.toString());
      setSearchParams({});

      const fetchUserInfo = async () => {
        try {
          const response = await apiClient.get("/api/auth/userInfo");
          if (response.data?.user) {
            setUserInfo(response.data.user);
            toast.success("Logged in successfully via OAuth");
            navigate(response.data.user.profileSetup ? "/chat" : "/profile");
          }
        } catch (error) {
          console.error("Failed to fetch user info after OAuth:", error);
          toast.error("Authentication failed. Please try again.");
          localStorage.removeItem("authToken");
          localStorage.removeItem("authTokenExpiry");
        }
      };
      fetchUserInfo();
    }
  }, [searchParams, setSearchParams, setUserInfo, navigate]);

  const handlePasswordReset = () => {
    setResettingPassword(false);
    setResetUser(null);
    setEmail("");
    setPassword("");
  };

  const handleBrandClick = () => {
    setGlobeAnimating(true);
    setTimeout(() => {
      setShowAuthPanel(true);
      setGlobeAnimating(false);
    }, 800);
  };

  const handlePrivacyClick = () => {
    navigate("/privacy-policy");
  };

  const handleCloseAuth = () => {
    setShowAuthPanel(false);
    setEmail("");
    setPassword("");
  };

  const validateLogin = (email, password) => {
    if (!email) { toast.error("Email is required"); return false; }
    if (!password) { toast.error("Password is required"); return false; }
    return true;
  };

  const handleLogIn = async () => {
    if (validateLogin(email, password)) {
      setLoading(true);
      try {
        const response = await apiClient.post(
          "/api/auth/login",
          { email, password },
          { withCredentials: true }
        );

        if (response.data.token) {
          const expiry = Date.now() + 3 * 24 * 60 * 60 * 1000;
          localStorage.setItem("authToken", response.data.token);
          localStorage.setItem("authTokenExpiry", expiry.toString());
        }

        if (response.data.resetPassword) {
          setResetUser(response.data.user);
          setResettingPassword(true);
          toast.info("Please reset your password.");
        } else if (response.data.user?._id) {
          setUserInfo(response.data.user);
          toast.success("Logged in successfully");
          navigate(response.data.user.profileSetup ? "/chat" : "/profile");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Login failed");
      } finally {
        setLoading(false);
      }
    }
  };

  if (resettingPassword) {
    return (
      <ResetPassword user={resetUser} onPasswordReset={handlePasswordReset} />
    );
  }

  const handleGithubLogin = () => {
    const serverUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_APP_SERVER_URL || getBaseUrl();
    window.location.href = `${serverUrl}/api/auth/github`;
  };

  const handleLinkedInLogin = () => {
    const serverUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_APP_SERVER_URL || getBaseUrl();
    window.location.href = `${serverUrl}/api/auth/linkedin`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      {/* 3D Globe Background - UNTOUCHED */}
      <div className="absolute inset-0 z-0">
        <ThreeErrorBoundary
          onBrandClick={handleBrandClick}
          onPrivacyClick={handlePrivacyClick}
          showAuth={showAuthPanel}
        >
          <Globe3D
            onBrandClick={handleBrandClick}
            onPrivacyClick={handlePrivacyClick}
            showAuth={showAuthPanel}
          />
        </ThreeErrorBoundary>
      </div>

      {/* Mobile Background */}
      <div className="absolute inset-0 z-0 block md:hidden">
        <div className="w-full h-full bg-slate-900/80 backdrop-blur-xl"></div>
      </div>

      {/* Authentication Panel */}
      <AnimatePresence>
        {showAuthPanel && (
          <>
            {/* Backdrop blur */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Auth Panel */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-4 z-30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="relative w-full max-w-md">
                {/* Close button */}
                <button
                  onClick={handleCloseAuth}
                  className="absolute -top-4 -right-4 z-40 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white hover:bg-cyan-700 transition-colors duration-200 shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Auth Form */}
                <div className="relative p-8 rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 shadow-2xl overflow-hidden mx-4">
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-3xl font-bold text-white">
                          Welcome Back
                        </h3>
                      </div>
                      <p className="text-cyan-300 font-mono text-sm">
                        Secure access to Communiatec community
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Email Input */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-cyan-400" />
                          Email Address
                        </label>
                        <Input
                          type="email"
                          placeholder="user@communiatec.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 bg-white/10 border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:bg-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all duration-200 text-base pl-4 font-mono"
                        />
                      </div>

                      {/* Password Input */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-cyan-400" />
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter secure password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-14 md:h-12 bg-white/10 border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:bg-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all duration-200 text-base pl-4 pr-12 font-mono touch-manipulation"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Sign In Button */}
                      <Button
                        onClick={handleLogIn}
                        disabled={loading}
                        className="w-full h-14 md:h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-lg transition-all duration-200 relative overflow-hidden touch-manipulation"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Authenticating...</span>
                          </div>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            Sign In Securely
                          </span>
                        )}
                      </Button>

                      {/* Divider */}
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-600/50" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-slate-800/80 text-gray-300 font-semibold rounded-full border border-slate-600/30">
                            Or use SSO
                          </span>
                        </div>
                      </div>

                      {/* SSO Buttons */}
                      <div className="flex flex-col md:flex-row gap-4">
                        <Button
                          variant="outline"
                          onClick={handleGithubLogin}
                          className="flex-1 h-12 md:h-10 bg-white/10 hover:bg-white/15 border-slate-600/50 hover:border-slate-500 text-gray-300 hover:text-white rounded-xl transition-all duration-200 font-semibold touch-manipulation"
                        >
                          <FaGithub className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                          GitHub
                        </Button>

                        <Button
                          variant="outline"
                          onClick={handleLinkedInLogin}
                          className="flex-1 h-12 md:h-10 bg-white/10 hover:bg-white/15 border-slate-600/50 hover:border-slate-500 text-gray-300 hover:text-white rounded-xl transition-all duration-200 font-semibold touch-manipulation"
                        >
                          <FaLinkedin className="h-5 w-5 md:h-4 md:w-4 mr-2 text-cyan-400" />
                          LinkedIn
                        </Button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                      <p className="text-xs text-gray-400 font-mono">
                        Protected by community-grade security
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Loading overlay during globe animation */}
      <AnimatePresence>
        {globeAnimating && (
          <motion.div
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-mono">
                Initializing secure connection...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
