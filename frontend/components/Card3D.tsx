"use client";

import React, { useState } from "react";

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  depth?: number; // Preserved for API compatibility (tilt disabled)
  glare?: boolean;
  borderGlow?: boolean;
}

export default function Card3D({
  children,
  className = "",
  depth = 8,
  glare = true,
  borderGlow = true,
  ...props
}: Card3DProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative select-none ${className}`}
      {...props}
    >
      <div className="w-full h-full rounded-2xl relative transition-shadow duration-300">
        {/* Border glow highlight on hover (visual only, stationary) */}
        {borderGlow && (
          <div
            className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/30 opacity-0 transition-opacity duration-300 pointer-events-none ${
              isHovered ? "opacity-100" : ""
            }`}
            style={{ filter: "blur(1px)" }}
          />
        )}

        {/* Inner container - stationary without physical movement or 3D transform */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          {children}

          {/* Subtle static ambient sheen on hover (no cursor tracking/motion) */}
          {glare && (
            <div
              className={`absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              style={{
                background:
                  "radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05), transparent 70%)",
                mixBlendMode: "overlay",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

