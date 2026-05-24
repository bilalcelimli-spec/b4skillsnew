/**
 * Design System v2 — Radix-based Component Library
 * ─────────────────────────────────────────────────────────────────────────────
 * All components:
 *   • Built on Radix UI primitives (WAI-ARIA out of the box)
 *   • Styled with CSS custom properties (dark mode automatic)
 *   • Use class-variance-authority for type-safe variant props
 *   • Keyboard navigable, screen-reader tested
 *   • WCAG 2.2 AAA colour contrast ratios maintained
 */

import React, { forwardRef } from "react";
import * as RadixDialog      from "@radix-ui/react-dialog";
import * as RadixToast       from "@radix-ui/react-toast";
import * as RadixTooltip     from "@radix-ui/react-tooltip";
import * as RadixProgress    from "@radix-ui/react-progress";
import * as RadixSwitch      from "@radix-ui/react-switch";
import * as RadixTabs        from "@radix-ui/react-tabs";
import * as RadixAvatar      from "@radix-ui/react-avatar";
import * as RadixScrollArea  from "@radix-ui/react-scroll-area";
import * as RadixSeparator   from "@radix-ui/react-separator";
import * as RadixToggle      from "@radix-ui/react-toggle";
import * as RadixAccordion   from "@radix-ui/react-accordion";
import * as VisuallyHidden   from "@radix-ui/react-visually-hidden";
import { cva, type VariantProps } from "class-variance-authority";
import { motion as m, AnimatePresence } from "./motion.js";
import { clsx } from "clsx";

// ── Utility ───────────────────────────────────────────────────────────────────

export function cn(...inputs: (string | undefined | null | false)[]) {
  return clsx(inputs);
}

// ── Button ────────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  // Base
  [
    "inline-flex items-center justify-center gap-2 font-medium select-none",
    "transition-all duration-[120ms] ease-[var(--ease-standard)]",
    "rounded-[var(--radius-md)] cursor-pointer",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-ring)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:   "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] shadow-[var(--shadow-sm)]",
        secondary: "bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--border)] hover:border-[var(--border-strong)]",
        ghost:     "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]",
        danger:    "bg-[var(--error)] text-white hover:opacity-90 shadow-[var(--shadow-sm)]",
        success:   "bg-[var(--success)] text-white hover:opacity-90 shadow-[var(--shadow-sm)]",
        link:      "bg-transparent text-[var(--brand)] underline-offset-4 hover:underline p-0 h-auto",
        outline:   "bg-transparent border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand-subtle)]",
      },
      size: {
        xs: "h-7  px-2.5 text-xs  gap-1",
        sm: "h-8  px-3   text-sm  gap-1.5",
        md: "h-9  px-4   text-sm  gap-2",
        lg: "h-11 px-5   text-base gap-2",
        xl: "h-13 px-6   text-lg  gap-2.5",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0",
        "icon-lg": "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading
        ? <Spinner size={size === "xl" || size === "lg" ? "md" : "sm"} />
        : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
);
Button.displayName = "Button";

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = size === "sm" ? 14 : size === "md" ? 18 : 24;
  return (
    <svg
      className={className}
      width={s} height={s} viewBox="0 0 24 24" fill="none"
      aria-hidden="true"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs",
  {
    variants: {
      variant: {
        default:  "bg-[var(--brand-subtle)]   text-[var(--brand)]",
        success:  "bg-[var(--success-subtle)] text-[var(--success)]",
        warning:  "bg-[var(--warning-subtle)] text-[var(--warning)]",
        error:    "bg-[var(--error-subtle)]   text-[var(--error)]",
        info:     "bg-[var(--info-subtle)]    text-[var(--info)]",
        neutral:  "bg-[var(--bg-subtle)]      text-[var(--text-secondary)]",
        solid:    "bg-[var(--brand)]          text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }}
        />
      )}
      {children}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
  border?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = "md", shadow = "sm", border = true, children, style, ...props }, ref) => {
    const padMap  = { none: "0", sm: "12px", md: "20px", lg: "28px" };
    const shadMap = { none: "none", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };
    return (
      <div
        ref={ref}
        className={className}
        style={{
          background:   "var(--bg-surface)",
          borderRadius: "var(--radius-xl)",
          padding:      padMap[padding],
          boxShadow:    shadMap[shadow],
          border:       border ? "1px solid var(--border)" : "none",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

// ── Progress ──────────────────────────────────────────────────────────────────

export interface ProgressProps {
  value: number;       // 0–100
  max?: number;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  color?: "brand" | "success" | "warning" | "error";
  animate?: boolean;
  className?: string;
}

const PROGRESS_COLORS = {
  brand:   "var(--brand)",
  success: "var(--success)",
  warning: "var(--warning)",
  error:   "var(--error)",
};
const PROGRESS_SIZES  = { xs: 4, sm: 6, md: 8, lg: 12 };

export function Progress({ value, max = 100, label, size = "md", color = "brand", animate = true, className }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const h   = PROGRESS_SIZES[size];

  return (
    <RadixProgress.Root
      className={className}
      value={value}
      max={max}
      aria-label={label}
      style={{ width: "100%", height: h, background: "var(--bg-subtle)", borderRadius: "var(--radius-full)", overflow: "hidden" }}
    >
      <RadixProgress.Indicator
        style={{
          height: "100%",
          width: `${pct}%`,
          background: PROGRESS_COLORS[color],
          borderRadius: "var(--radius-full)",
          transition: animate ? "width 0.5s var(--ease-decelerate)" : "none",
        }}
      />
    </RadixProgress.Root>
  );
}

// ── Switch ────────────────────────────────────────────────────────────────────

export interface SwitchProps extends RadixSwitch.SwitchProps {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ label, description, ...props }, ref) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
      <RadixSwitch.Root
        ref={ref}
        {...props}
        style={{
          width: 42, height: 24, flexShrink: 0,
          background: props.checked ? "var(--brand)" : "var(--border-strong)",
          borderRadius: "var(--radius-full)", border: "none", cursor: "pointer",
          transition: "background var(--duration-sm) var(--ease-standard)",
          position: "relative", display: "flex", alignItems: "center", padding: "2px",
        }}
      >
        <RadixSwitch.Thumb
          style={{
            display: "block", width: 20, height: 20,
            borderRadius: "var(--radius-full)", background: "white",
            boxShadow: "var(--shadow-sm)",
            transition: "transform var(--duration-sm) var(--ease-standard)",
            transform: props.checked ? "translateX(18px)" : "translateX(0)",
          }}
        />
      </RadixSwitch.Root>
      {(label || description) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {label     && <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>}
          {description && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{description}</span>}
        </div>
      )}
    </label>
  )
);
Switch.displayName = "Switch";

// ── Tabs ──────────────────────────────────────────────────────────────────────

export const Tabs      = RadixTabs.Root;
export const TabsList  = forwardRef<HTMLDivElement, RadixTabs.TabsListProps>(
  ({ className, style, ...props }, ref) => (
    <RadixTabs.List
      ref={ref}
      className={className}
      style={{
        display: "flex", gap: 2, padding: 4,
        background: "var(--bg-subtle)", borderRadius: "var(--radius-lg)",
        ...style,
      }}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<HTMLButtonElement, RadixTabs.TabsTriggerProps>(
  ({ className, style, ...props }, ref) => (
    <RadixTabs.Trigger
      ref={ref}
      className={className}
      style={{
        padding: "6px 14px", borderRadius: "var(--radius-md)", border: "none",
        fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
        color: "var(--text-secondary)", background: "transparent",
        transition: "all var(--duration-sm) var(--ease-standard)",
        ...style,
      }}
      {...props}
    />
  )
);
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = RadixTabs.Content;

// ── Avatar ────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  src?: string;
  fallback: string;
  size?: number;
  online?: boolean;
  className?: string;
}

export function Avatar({ src, fallback, size = 36, online, className }: AvatarProps) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }} className={className}>
      <RadixAvatar.Root
        style={{
          width: size, height: size, borderRadius: "var(--radius-full)",
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--brand-subtle)", flexShrink: 0,
        }}
      >
        {src && <RadixAvatar.Image src={src} alt={fallback} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <RadixAvatar.Fallback
          style={{ color: "var(--brand)", fontWeight: 600, fontSize: size * 0.35 }}
        >
          {fallback.slice(0, 2).toUpperCase()}
        </RadixAvatar.Fallback>
      </RadixAvatar.Root>
      {online !== undefined && (
        <span
          aria-label={online ? "Online" : "Offline"}
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: size * 0.28, height: size * 0.28,
            borderRadius: "var(--radius-full)",
            background: online ? "var(--success)" : "var(--text-muted)",
            border: "2px solid var(--bg-surface)",
          }}
        />
      )}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

export interface TooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  children: React.ReactNode;
}

export function Tooltip({ content, side = "top", delayDuration = 400, children }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            style={{
              padding: "6px 10px", borderRadius: "var(--radius-md)",
              background: "var(--neutral-9, #1e293b)", color: "white",
              fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.4,
              boxShadow: "var(--shadow-lg)", zIndex: "var(--z-tooltip)",
              maxWidth: 260,
            }}
          >
            {content}
            <RadixTooltip.Arrow style={{ fill: "var(--neutral-9, #1e293b)" }} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

// ── Dialog / Modal ────────────────────────────────────────────────────────────

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const DIALOG_WIDTHS = { sm: 400, md: 540, lg: 720, xl: 960, full: "calc(100vw - 48px)" };

export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              <RadixDialog.Overlay asChild>
                <m.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{
                    position: "fixed", inset: 0,
                    background: "var(--bg-overlay)",
                    zIndex: "var(--z-overlay)",
                    backdropFilter: "blur(4px)",
                  }}
                />
              </RadixDialog.Overlay>
              <RadixDialog.Content asChild>
                <m.div
                  initial={{ opacity: 0, scale: 0.94, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{
                    position: "fixed", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: DIALOG_WIDTHS[size], maxWidth: "calc(100vw - 32px)",
                    maxHeight: "calc(100dvh - 48px)", overflowY: "auto",
                    background: "var(--bg-surface)", borderRadius: "var(--radius-2xl)",
                    boxShadow: "var(--shadow-2xl, 0 25px 50px -12px rgb(0 0 0 / 0.25))",
                    border: "1px solid var(--border)",
                    zIndex: "var(--z-modal)",
                    padding: "24px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
                    <div>
                      <RadixDialog.Title style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                        {title}
                      </RadixDialog.Title>
                      {description && (
                        <RadixDialog.Description style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                          {description}
                        </RadixDialog.Description>
                      )}
                    </div>
                    <RadixDialog.Close asChild>
                      <button
                        aria-label="Close dialog"
                        style={{
                          width: 32, height: 32, borderRadius: "var(--radius-md)", border: "none",
                          background: "var(--bg-subtle)", color: "var(--text-secondary)",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </RadixDialog.Close>
                  </div>
                  <div>{children}</div>
                  {footer && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                      {footer}
                    </div>
                  )}
                </m.div>
              </RadixDialog.Content>
            </>
          )}
        </AnimatePresence>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export interface ToastData {
  id?: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
  duration?: number;
}

const TOAST_COLORS = {
  default: "var(--brand)", success: "var(--success)",
  warning: "var(--warning)", error: "var(--error)", info: "var(--info)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixToast.Provider swipeDirection="right">
      {children}
      <RadixToast.Viewport
        style={{
          position: "fixed", bottom: 24, right: 24,
          display: "flex", flexDirection: "column", gap: 8,
          zIndex: "var(--z-toast)", width: 360, maxWidth: "calc(100vw - 32px)",
        }}
      />
    </RadixToast.Provider>
  );
}

export function ToastItem({ title, description, variant = "default", duration = 4000, open, onOpenChange }: ToastData & { open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const accentColor = TOAST_COLORS[variant];
  return (
    <RadixToast.Root
      open={open} onOpenChange={onOpenChange}
      duration={duration}
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)", padding: "12px 14px",
        boxShadow: "var(--shadow-lg)", display: "flex", gap: 10,
        alignItems: "flex-start",
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <RadixToast.Title style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
          {title}
        </RadixToast.Title>
        {description && (
          <RadixToast.Description style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
            {description}
          </RadixToast.Description>
        )}
      </div>
      <RadixToast.Close
        aria-label="Dismiss"
        style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
      >
        ×
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

// ── ScrollArea ────────────────────────────────────────────────────────────────

export function ScrollArea({ children, className, style, maxHeight }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; maxHeight?: number | string }) {
  return (
    <RadixScrollArea.Root className={className} style={{ maxHeight, overflow: "hidden", ...style }}>
      <RadixScrollArea.Viewport style={{ width: "100%", height: "100%" }}>
        {children}
      </RadixScrollArea.Viewport>
      <RadixScrollArea.Scrollbar orientation="vertical" style={{ display: "flex", padding: "2px", width: 8, background: "transparent" }}>
        <RadixScrollArea.Thumb style={{ flex: 1, background: "var(--border-strong)", borderRadius: "var(--radius-full)" }} />
      </RadixScrollArea.Scrollbar>
    </RadixScrollArea.Root>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────────

export function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical"; className?: string }) {
  return (
    <RadixSeparator.Root
      orientation={orientation}
      className={className}
      style={{
        background: "var(--border)",
        height: orientation === "horizontal" ? 1 : "100%",
        width:  orientation === "vertical"   ? 1 : "100%",
      }}
    />
  );
}

// ── Accordion ────────────────────────────────────────────────────────────────

export const Accordion = RadixAccordion.Root;
export function AccordionItem({ value, trigger, children }: { value: string; trigger: React.ReactNode; children: React.ReactNode }) {
  return (
    <RadixAccordion.Item value={value} style={{ borderBottom: "1px solid var(--border)" }}>
      <RadixAccordion.Header>
        <RadixAccordion.Trigger
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0", background: "none", border: "none", cursor: "pointer",
            fontSize: "0.9375rem", fontWeight: 500, color: "var(--text-primary)", textAlign: "left",
          }}
        >
          {trigger}
          <span aria-hidden="true" style={{ transition: "transform var(--duration-sm) var(--ease-standard)" }}>▾</span>
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>
      <RadixAccordion.Content
        style={{ overflow: "hidden" }}
      >
        <div style={{ paddingBottom: 12, color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
          {children}
        </div>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  );
}

// ── VisuallyHidden re-export ──────────────────────────────────────────────────

export const SROnly = VisuallyHidden.Root;

// ── Animated page wrapper ─────────────────────────────────────────────────────

export function PageWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      style={{ minHeight: "100dvh" }}
    >
      {children}
    </m.div>
  );
}
