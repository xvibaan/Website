"use client";

import React from "react";

export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

export function evaluatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number; // 0: empty, 1: weak, 2: medium, 3: strong
  label: string;
  textColor: string;
  barColor: string;
} {
  if (!password || password.length === 0) {
    return {
      strength: "empty",
      score: 0,
      label: "Empty",
      textColor: "text-gray-500",
      barColor: "bg-white/10",
    };
  }

  let score = 0;

  const hasLength = password.length >= 6;
  const hasGoodLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (password.length < 5 || criteriaCount <= 1) {
    score = 1; // Weak
  } else if (hasGoodLength && criteriaCount >= 3) {
    score = 3; // Strong
  } else if (hasLength && criteriaCount >= 2) {
    score = 2; // Medium
  } else {
    score = 1; // Weak
  }

  if (score === 3) {
    return {
      strength: "strong",
      score: 3,
      label: "Strong",
      textColor: "text-emerald-400",
      barColor: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    };
  }

  if (score === 2) {
    return {
      strength: "medium",
      score: 2,
      label: "Medium",
      textColor: "text-amber-400",
      barColor: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    };
  }

  return {
    strength: "weak",
    score: 1,
    label: "Weak",
    textColor: "text-rose-400",
    barColor: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
  };
}

interface PasswordStrengthMeterProps {
  password?: string;
  className?: string;
}

export default function PasswordStrengthMeter({
  password = "",
  className = "",
}: PasswordStrengthMeterProps) {
  const { score, label, textColor, barColor } = evaluatePasswordStrength(password);

  return (
    <div
      id="password-strength-indicator"
      className={`mt-2 space-y-1.5 transition-all duration-200 ${className}`}
      aria-live="polite"
      aria-label={`Password strength: ${label}`}
    >
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-gray-400">Password strength</span>
        <span className={`font-semibold transition-colors duration-200 ${textColor}`}>
          {label}
        </span>
      </div>

      {/* 3 Color-Coded Bars: Weak, Medium, Strong */}
      <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
        {/* Bar 1 - Active on Weak, Medium, Strong */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            score >= 1 ? barColor : "bg-white/10"
          }`}
        />

        {/* Bar 2 - Active on Medium, Strong */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            score >= 2 ? barColor : "bg-white/10"
          }`}
        />

        {/* Bar 3 - Active only on Strong */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            score >= 3 ? barColor : "bg-white/10"
          }`}
        />
      </div>
    </div>
  );
}
