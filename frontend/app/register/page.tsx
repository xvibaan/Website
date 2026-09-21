"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, Hexagon } from "lucide-react";
import { motion } from "framer-motion";
import { registerWithAction } from "@/app/register/actions";
import ParticleBackground from "@/components/ParticleBackground";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="transition-transform group-hover:scale-110">
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

  const handleGoogleSignUp = () => {
    window.location.href = "/api/auth/signin?callbackUrl=/dashboard";
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center relative bg-[#0a0a0c] px-4 py-8">
      <ParticleBackground />
      
      {/* Ambient lighting behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md space-y-8 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl p-8 rounded-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-5 shadow-inner">
            <Hexagon className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white font-sans">Create your account</h2>
          <p className="mt-2 text-sm text-gray-400 font-sans">Welcome to Host Market Place</p>
        </div>

        <button 
          onClick={handleGoogleSignUp} 
          className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-all rounded-lg py-2.5 px-4 font-medium text-sm text-white group" 
          type="button"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-gray-500 font-medium">Or continue with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-3 rounded-lg border border-red-500/20 bg-red-500/10"
          >
            <p className="text-sm text-red-400 font-medium text-center">{error}</p>
          </motion.div>
        )}

        <form action={handleRegister} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">Email address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  disabled={isPending}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  disabled={isPending}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  required 
                  disabled={isPending}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center items-center bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg py-2.5 transition-all shadow-[0_0_20px_rgba(0,194,255,0.2)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Creating Account...</>
            ) : (
              "Sign up"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-white transition-colors font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
