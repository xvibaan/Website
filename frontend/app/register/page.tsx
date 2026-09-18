"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ShieldPlus } from "lucide-react";
import { motion } from "framer-motion";
import { registerWithAction } from "@/app/register/actions";
import ParticleBackground from "@/components/ParticleBackground";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="filter grayscale group-hover:grayscale-0 transition-all">
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
  const [isPending, startTransition] = useTransition();

  const handleRegister = (formData: FormData) => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("SYSTEM_ERR: PASSCODES DO NOT MATCH");
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
        setError("SYSTEM_ERR: INITIALIZATION FAILED.");
      }
    });
  };

  const handleGoogleSignUp = () => {
    window.location.href = "/api/auth/signin?callbackUrl=/dashboard";
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center relative">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-8 glass-card glow-border p-8 relative z-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded bg-primary/10 border border-primary flex items-center justify-center mb-5 animate-pulse-glow">
            <ShieldPlus className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-mono uppercase">NEW_OPERATIVE</h2>
          <p className="mt-2 text-xs text-primary/70 font-mono tracking-widest">INITIALIZE YOUR NEXUS ACCOUNT</p>
        </div>

        <button onClick={handleGoogleSignUp} className="cyber-btn-outline w-full flex items-center justify-center gap-3 group" type="button">
          <GoogleIcon />
          <span>OAUTH: GOOGLE</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-primary/20" />
          <span className="text-[10px] text-primary/50 font-mono tracking-widest">OR MANUAL CREATION</span>
          <div className="flex-1 h-px bg-primary/20" />
        </div>

        {error && (
          <div className="p-4 rounded border border-secondary/50 bg-secondary/10">
            <p className="text-sm text-secondary font-mono uppercase animate-glitch">{error}</p>
          </div>
        )}

        <form action={handleRegister} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-mono text-primary/70 tracking-widest mb-1.5">USER_ID [EMAIL]</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-primary/50" />
                </div>
                <input id="email" name="email" type="email" required disabled={isPending}
                  className="cyber-input !pl-11" placeholder="operative@nexus.net" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono text-primary/70 tracking-widest mb-1.5">PASSCODE</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-primary/50" />
                </div>
                <input id="password" name="password" type="password" required disabled={isPending}
                  className="cyber-input !pl-11" placeholder="••••••••" />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-mono text-primary/70 tracking-widest mb-1.5">VERIFY PASSCODE</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-primary/50" />
                </div>
                <input id="confirmPassword" name="confirmPassword" type="password" required disabled={isPending}
                  className="cyber-input !pl-11" placeholder="••••••••" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="cyber-btn w-full flex justify-center items-center"
          >
            {isPending ? (
              <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> REGISTERING...</>
            ) : (
              "INITIALIZE"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 font-mono tracking-widest">
            ALREADY REGISTERED?{" "}
            <Link href="/login" className="text-primary hover:text-white transition-colors underline decoration-primary/30 underline-offset-4">
              LOGIN_NOW
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
