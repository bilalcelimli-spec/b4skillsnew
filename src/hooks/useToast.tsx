import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ToastItem, type ToastData } from "../design-system/components.js";

interface ToastEntry extends ToastData {
  id: string;
  open: boolean;
}

interface ToastContextValue {
  toast: (data: Omit<ToastData, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const toast = useCallback((data: Omit<ToastData, "id">) => {
    const id = `toast-${++counter}`;
    setToasts((prev) => [...prev, { ...data, id, open: true }]);
  }, []);

  const handleOpenChange = useCallback((id: string, open: boolean) => {
    setToasts((prev) =>
      open ? prev : prev.map((t) => (t.id === id ? { ...t, open: false } : t))
    );
    if (!open) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          duration={t.duration}
          open={t.open}
          onOpenChange={(o) => handleOpenChange(t.id, o)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside AppToastProvider");
  return ctx;
}
