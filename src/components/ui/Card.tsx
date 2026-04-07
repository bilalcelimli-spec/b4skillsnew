import { cn } from "@/src/lib/utils";
import React from "react";

export const Card = ({ className, children, style, onClick }: { className?: string; children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) => (
  <div onClick={onClick} className={cn("bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden", className)} style={style}>
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("px-6 py-4 border-bottom border-slate-100", className)}>{children}</div>
);

export const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h3 className={cn("text-lg font-bold text-slate-900", className)}>{children}</h3>
);

export const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("px-6 py-4", className)}>{children}</div>
);

export const CardFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("px-6 py-4 bg-slate-50 border-top border-slate-100", className)}>{children}</div>
);
