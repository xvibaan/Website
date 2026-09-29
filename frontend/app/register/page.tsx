"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { registerWithAction } from "@/app/register/actions";
import Card3D from "@/components/Card3D";
import PasswordStrengthMeter from "@/components/PasswordStrengthMeter";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="transition-opacity group-hover:opacity-90">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z" fill="#FBBC05"/>
      <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335"/>
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRegister = (formData: FormData) => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await registerWithAction(formData);
        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          router.push("/login");
        }
      } catch (err) {
        setError("Failed to create account. Please try again.");
      }
    });
  };

  const handleGoogleSignUp = async () => {
    if (isGoogleLoading) return;
    setError(null);
    setIsGoogleLoading(true);

    try {
      const res = await fetch("/api/auth/providers");
      if (res.ok) {
        const providers = await res.json();
        if (providers?.google) {
          window.location.href = "/api/auth/signin/google?callbackUrl=/dashboard";
          return;
        }
      }
      setError(
        "Google OAuth authentication is unconfigured in this environment (GOOGLE_CLIENT_ID missing). Please create an account using your email and password."
      );
    } catch {
      setError("Unable to initiate Google authentication. Please register with email.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center relative px-4 py-12 overflow-hidden">
      {/* Cinematic Ambient Lighting */}
      <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Ambient Micro-Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <Card3D depth={6} glare={true} borderGlow={true}>
          <div
            className="p-8 sm:p-9 rounded-3xl bg-[#0b0d17]/85 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent border border-primary/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create an Account
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-gray-400">
                Join Host Market Place to access digital products and licenses
              </p>
            </div>

            {/* Google OAuth Button */}
            <div>
              <button
                onClick={handleGoogleSignUp}
                type="button"
                disabled={isGoogleLoading || isPending}
                className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors rounded-xl py-3 px-4 text-xs font-semibold text-white group shadow-sm focus-visible:ring-2 focus-visible:ring-primary/60 outline-none disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Connecting Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-gray-500 uppercase tracking-widest font-mono">
                or with email
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 mb-5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form action={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-gray-300 mb-1.5 font-sans"
                >
                  Email address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    disabled={isPending}
                    placeholder="name@example.com"
                    className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-gray-300 mb-1.5 font-sans"
                >
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isPending}
                    placeholder="••••••••"
                    className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-11 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors disabled:opacity-50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isPending}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center justify-center text-gray-400 hover:text-primary focus:outline-none focus:text-primary transition-colors disabled:opacity-50"
                  >
                    <span className="p-1 rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center">
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </div>
                {/* Real-time Password Strength Meter */}
                <PasswordStrengthMeter password={password} />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-gray-300 mb-1.5 font-sans"
                >
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    disabled={isPending}
                    placeholder="••••••••"
                    className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-11 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors disabled:opacity-50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isPending}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center justify-center text-gray-400 hover:text-primary focus:outline-none focus:text-primary transition-colors disabled:opacity-50"
                  >
                    <span className="p-1 rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center">
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Creating Account...
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span>Complete Registration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Sign in link */}
            <div className="text-center mt-6 pt-5 border-t border-white/[0.08]">
              <p className="text-xs text-gray-400">
                Already registered?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-white font-semibold transition-colors underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </Card3D>
      </div>
    </div>
  );
}
