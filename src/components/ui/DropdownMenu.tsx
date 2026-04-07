import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/src/lib/utils";

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { open, setOpen });
        }
        return child;
      })}
    </div>
  );
};

export const DropdownMenuTrigger = ({ asChild, children, open, setOpen }: any) => {
  const trigger = asChild ? children : <button>{children}</button>;
  return React.cloneElement(trigger, {
    onClick: (e: any) => {
      trigger.props.onClick?.(e);
      setOpen(!open);
    },
  });
};

export const DropdownMenuContent = ({ children, open, setOpen, align = "end", className }: any) => {
  if (!open) return null;
  return (
    <div className={cn(
      "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md animate-in fade-in-0 zoom-in-95",
      align === "end" ? "right-0" : "left-0",
      className
    )}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { setOpen });
        }
        return child;
      })}
    </div>
  );
};

export const DropdownMenuItem = ({ children, onClick, className, setOpen }: any) => {
  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        setOpen?.(false);
      }}
    >
      {children}
    </div>
  );
};
