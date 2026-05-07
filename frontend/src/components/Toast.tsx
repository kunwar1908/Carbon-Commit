import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastProps = {
  toasts: Toast[];
  onRemove: (id: string) => void;
};

export const ToastContainer = ({ toasts, onRemove }: ToastProps) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const getStyles = () => {
    const base = "rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300";
    switch (toast.type) {
      case "success":
        return `${base} bg-carbon-700/80 border-accent-500/40 text-accent-300`;
      case "error":
        return `${base} bg-red-950/80 border-red-500/40 text-red-300`;
      case "warning":
        return `${base} bg-yellow-950/80 border-yellow-500/40 text-yellow-300`;
      case "info":
        return `${base} bg-carbon-800/80 border-carbon-600/40 text-carbon-200`;
      default:
        return base;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "!";
      case "info":
        return "ℹ";
      default:
        return "•";
    }
  };

  return (
    <div className={getStyles()}>
      <div className="flex items-center gap-2">
        <span className="font-bold">{getIcon()}</span>
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={() => onRemove(toast.id)}
          className="ml-2 text-lg leading-none opacity-60 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
};
