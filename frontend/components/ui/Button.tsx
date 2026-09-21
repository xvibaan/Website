import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-background hover:bg-primary-hover shadow-neon": variant === "primary",
            "bg-card border border-card-border text-foreground hover:bg-card-border backdrop-blur-md": variant === "secondary",
            "border border-primary text-primary hover:bg-primary/10": variant === "outline",
            "hover:bg-card-border text-foreground": variant === "ghost",
            "bg-destructive text-white hover:bg-destructive/90": variant === "destructive",
            "h-9 px-4 text-sm": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-11 px-8 text-lg": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
