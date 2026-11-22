import { cn } from "@/src/lib/utils";
import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** cta: the raised yellow button (babilspeak) — one per screen, for the main action. */
  variant?: "primary" | "cta" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
      cta: "button-depth active:scale-100",
      secondary: "bg-slate-800 text-white hover:bg-slate-900",
      outline: "border-2 border-indigo-600/40 bg-white hover:bg-indigo-50 text-indigo-700",
      ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
      danger: "bg-red-600 text-white hover:bg-red-700",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg font-medium",
      icon: "p-2",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-bold",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
