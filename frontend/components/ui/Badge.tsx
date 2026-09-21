import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary text-background hover:bg-primary/80": variant === "default",
          "border-transparent bg-secondary text-white hover:bg-secondary/80": variant === "secondary",
          "border-transparent bg-destructive/20 text-destructive border-destructive/50": variant === "destructive",
          "border-transparent bg-green-500/20 text-green-400 border-green-500/50": variant === "success",
          "text-foreground border-card-border": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
