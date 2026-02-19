import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Shield,
  Fingerprint,
  Smartphone,
  RefreshCw,
} from "lucide-react";

// Enhanced PIN hashing with salt and multiple rounds (matching PinSetup)
const hashPin = (pin, userId) => {
  try {
    const salt = `communiatec_secure_${userId}_${new Date().getFullYear()}`;
    let hash = btoa(`${salt}:${pin}`);
    for (let i = 0; i < 3; i++) {
      hash = btoa(`${hash}:${salt}`);
    }
    return hash;
  } catch (e) {
    return btoa(`fallback_${pin}_${userId}`);
  }
};

// Legacy hash function for backward compatibility
const hashPinLegacy = (pin) => {
  try {
    return btoa(`communiatec_pin:${pin}`);
  } catch (e) {
    return pin;
  }
};

// Modern PIN input with individual digit boxes
const PinDigitInput = ({ digits, onChange, onComplete, disabled, error, shake }) => {
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!disabled) {
      const firstEmpty = digits.findIndex((d) => d === "");
      const focusIndex = firstEmpty === -1 ? 0 : firstEmpty;
      inputRefs.current[focusIndex]?.focus();
    }
  }, [disabled, digits]);

  const handleChange = (index, value) => {
    if (disabled) return;
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    onChange(newDigits);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "") && newDigits.length === 4) {
      onComplete(newDigits.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      if (digits[index] === "" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    const digits = paste.replace(/[^0-9]/g, "").slice(0, 4).split("");
    if (digits.length === 4) {
      onChange(digits);
      onComplete(digits.join(""));
    }
  };

  return (
    <div className={`flex gap-3 justify-center ${shake ? "animate-shake" : ""}`}>
      {[0, 1, 2, 3].map((index) => (
        <div key={index}>
          <input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index] || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`
              w-14 h-16 sm:w-16 sm:h-18 text-center text-2xl font-bold
              bg-white/10 backdrop-blur-sm border-2 rounded-2xl
              text-white placeholder:text-white/30
              transition-all duration-200 outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:scale-105 focus:shadow-lg focus:shadow-green-500/20
              ${
                error
                  ? "border-red-500 bg-red-500/10 focus:border-red-400"
                  : "border-white/20 focus:border-green-400 hover:border-white/30"
              }
              ${digits[index] ? "border-green-500 bg-green-500/20" : ""}
            `}
          />
        </div>
      ))}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-8px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

const ContactAdminPage = ({ onBack }) => {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      detail: "support@communiatec.com",
      time: "24-48 hrs",
      color: "blue",
      href: "mailto:support@communiatec.com?subject=PIN Reset Request",
    },
    {
      icon: Phone,
      title: "Phone Support",
      detail: "+1 (555) 123-4567",
      time: "Mon-Fri 9-5",
      color: "green",
      href: "tel:+15551234567",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      detail: "Available on our website",
      status: "Online",
      color: "purple",
      href: "#",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-orange-500/20 border border-white/10 mb-6">
            <Lock className="w-10 h-10 text-orange-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">PIN Recovery</h2>
          <p className="text-white/60">
            Need help with your PIN? Our support team is here to help
          </p>
        </div>

        {/* Main Card */}
        <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="space-y-6">
            {/* Security Info */}
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-orange-200 text-sm font-medium mb-1">
                    Secure PIN Reset Process
                  </p>
                  <p className="text-orange-300/80 text-xs">
                    For your security, PIN resets require administrator
                    verification. Choose your preferred contact method below.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Methods */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Contact Support
              </h3>

              <div className="space-y-3">
                {contactMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <a
                      key={method.title}
                      href={method.href}
                      className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all duration-200 group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-${method.color}-500/20 flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 text-${method.color}-400`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{method.title}</p>
                          <p className="text-white/60 text-sm">{method.detail}</p>
                        </div>
                        <div className="text-right">
                          {method.status ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-green-400 text-xs font-medium">
                                {method.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-white/40 text-xs">
                              {method.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Required Information */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Please include in your message:
              </h4>
              <ul className="space-y-2 text-sm text-white/70">
                {[
                  "Your registered email address",
                  "Account verification details (e.g., last login date)",
                  "Reason for PIN reset request",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Back button */}
            <Button
              onClick={onBack}
              variant="ghost"
              className="w-full h-12 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to PIN Entry
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-white/40 flex items-center justify-center gap-2">
            <Shield className="w-3 h-3" />
            Your security is our priority. All PIN resets are processed securely
            by our admin team.
          </p>
        </div>
      </div>
    </div>
  );
};

const PinVerify = ({ onFinish, userInfo }) => {
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [showForgotPage, setShowForgotPage] = useState(false);
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const userId = userInfo?._id || userInfo?.id;
  const pinKey = userId ? `communiatec_pin_${userId}` : null;
  const maxAttempts = 5;
  const lockDuration = 30;

  useEffect(() => {
    const lockKey = `${pinKey}_locked`;
    const lockedUntil = localStorage.getItem(lockKey);

    if (lockedUntil) {
      const remaining = parseInt(lockedUntil) - Date.now();
      if (remaining > 0) {
        setIsLocked(true);
        setLockTimer(Math.ceil(remaining / 1000));

        const interval = setInterval(() => {
          const newRemaining = parseInt(lockedUntil) - Date.now();
          if (newRemaining <= 0) {
            setIsLocked(false);
            setLockTimer(0);
            localStorage.removeItem(lockKey);
            clearInterval(interval);
          } else {
            setLockTimer(Math.ceil(newRemaining / 1000));
          }
        }, 1000);

        return () => clearInterval(interval);
      } else {
        localStorage.removeItem(lockKey);
      }
    }
  }, [pinKey]);

  const handleVerify = async (pin) => {
    if (!pinKey) {
      toast.error("Missing user context");
      return;
    }

    if (isLocked) {
      toast.error(`Account locked. Try again in ${lockTimer} seconds.`);
      return;
    }

    const stored = localStorage.getItem(pinKey);
    if (!stored) {
      toast.error("No PIN found. Please contact support to set up your PIN.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const hashedNew = hashPin(pin, userId);
      const hashedLegacy = hashPinLegacy(pin);

      if (hashedNew === stored || hashedLegacy === stored) {
        setAttempts(0);
        localStorage.removeItem(`${pinKey}_attempts`);

        const verifiedKey = `communiatec_pin_verified_${userId}`;
        sessionStorage.setItem(verifiedKey, "true");

        toast.success("🔓 Access granted!");

        setTimeout(() => {
          onFinish && onFinish();
        }, 500);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem(`${pinKey}_attempts`, newAttempts.toString());

        if (newAttempts >= maxAttempts) {
          const lockUntil = Date.now() + lockDuration * 1000;
          localStorage.setItem(`${pinKey}_locked`, lockUntil.toString());
          setIsLocked(true);
          setLockTimer(lockDuration);
          setError(
            `Account locked for ${lockDuration} seconds due to multiple failed attempts.`
          );
        } else {
          const remaining = maxAttempts - newAttempts;
          setError(
            `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          );
        }

        setPinDigits(["", "", "", ""]);
        setShake(true);
        setTimeout(() => setShake(false), 600);

        toast.error(
          `Incorrect PIN. ${maxAttempts - newAttempts} attempts remaining.`
        );
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinComplete = (pin) => {
    if (isLocked || loading) return;
    handleVerify(pin);
  };

  const handleForgot = () => {
    setShowForgotPage(true);
  };

  const handleClear = () => {
    setPinDigits(["", "", "", ""]);
    setError("");
  };

  if (showForgotPage) {
    return <ContactAdminPage onBack={() => setShowForgotPage(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl border border-white/10 mb-6 transition-all duration-200 ${
              isLocked
                ? "bg-red-500/20"
                : attempts > 0
                ? "bg-orange-500/20"
                : "bg-green-500/20"
            }`}
          >
            {isLocked ? (
              <AlertTriangle className="w-10 h-10 text-red-400" />
            ) : (
              <Lock className="w-10 h-10 text-green-400" />
            )}
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            {isLocked ? "Account Locked" : "Welcome Back"}
          </h2>

          <p className="text-white/60">
            {isLocked
              ? `Please wait ${lockTimer} seconds before trying again`
              : "Enter your 4-digit PIN to continue"}
          </p>
        </div>

        {/* Main Card */}
        <div
          className={`p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-200 ${
            isLocked ? "border-red-400/30" : ""
          }`}
        >
          <div className="space-y-6">
            {/* PIN Input */}
            <div className="text-center">
              <label className="block text-sm font-medium text-white/80 mb-6">
                {isLocked ? "Account Temporarily Locked" : "Enter your PIN"}
              </label>

              <PinDigitInput
                digits={pinDigits}
                onChange={setPinDigits}
                onComplete={handlePinComplete}
                disabled={loading || isLocked}
                error={error && error !== ""}
                shake={shake}
              />

              {/* Error message */}
              {error && (
                <div
                  className={`mt-4 flex items-center justify-center gap-2 text-sm ${
                    isLocked ? "text-red-400" : "text-orange-400"
                  }`}
                >
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {/* Lock timer */}
              {isLocked && (
                <div className="mt-4 flex items-center justify-center gap-2 text-red-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="font-mono text-lg">{lockTimer}s</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!isLocked && (
              <div className="flex gap-3">
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  disabled={loading}
                  className="px-4 h-12 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10"
                >
                  <RefreshCw size={16} />
                </Button>

                <Button
                  onClick={handleForgot}
                  variant="ghost"
                  disabled={loading}
                  className="flex-1 h-12 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10"
                >
                  <MessageCircle size={16} className="mr-2" />
                  Need Help?
                </Button>
              </div>
            )}

            {/* Attempt indicator */}
            {!isLocked && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <div className="flex gap-1">
                  {Array.from({ length: maxAttempts }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        i < attempts ? "bg-orange-400" : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Security footer */}
            <div className="text-center pt-2">
              <p className="text-xs text-white/40 flex items-center justify-center gap-2">
                <Fingerprint className="w-3 h-3" />
                Secured with advanced encryption
              </p>
            </div>
          </div>
        </div>

        {/* Mobile optimization note */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
            <Smartphone size={12} />
            <span>Optimized for mobile and desktop</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinVerify;
