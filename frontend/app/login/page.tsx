"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { loginWithCookie } from "@/app/login/actions";
import { useAuth } from "@/context/AuthContext";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z" fill="#FBBC05"/>
      <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await loginWithCookie(formData);
        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          await refreshUser();
          router.push("/products");
        }
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const handleGoogleSignIn = () => {
    // NextAuth.js Google OAuth - will be functional once API keys are configured
    window.location.href = "/api/auth/signin?callbackUrl=/dashboard";
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 relative">
      {/* Background orbs */}
      <div className="orb w-96 h-96 bg-primary/20 top-1/4 left-1/4 animate-float" />
      <div className="orb w-64 h-64 bg-secondary/15 bottom-1/4 right-1/4 animate-float-delayed" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-8 glass-card glow-border p-8 relative z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(6, 182, 212, 0.2))" }}>
            <LogIn className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to Host Market Place</p>
        </div>

        {/* Google OAuth Button */}
        <button onClick={handleGoogleSignIn} className="google-btn" type="button">
          <GoogleIcon />
          <span>Sign in with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs text-slate-500 uppercase tracking-wider">or continue with email</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form action={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input id="email" name="email" type="email" required disabled={isPending}
                  className="glass-input !pl-11" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input id="password" name="password" type="password" required disabled={isPending}
                  className="glass-input !pl-11" placeholder="••••••••" />
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isPending}
            whileHover={!isPending ? { y: -1 } : {}}
            whileTap={!isPending ? { scale: 0.98 } : {}}
            className="glass-btn w-full flex justify-center items-center !py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Signing in...</>
            ) : (
              "Sign in"
            )}
          </motion.button>
        </form>

        <div className="text-center">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:text-primary-hover transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
