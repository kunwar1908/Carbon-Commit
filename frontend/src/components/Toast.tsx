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
        return `${base} bg-emerald-50 border-emerald-200 text-emerald-700`;
      case "error":
        return `${base} bg-red-50 border-red-200 text-red-700`;
      case "warning":
        return `${base} bg-yellow-50 border-yellow-200 text-yellow-700`;
      case "info":
        return `${base} bg-white/6 border-carbon-200 text-carbon-900`;
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
