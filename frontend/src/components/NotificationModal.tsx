import React from "react";
import { NotificationInbox } from "./NotificationInbox";

type NotificationModalProps = {
  open: boolean;
  onClose: () => void;
  accessToken: string;
};

export const NotificationModal = ({ open, onClose, accessToken }: NotificationModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <aside className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-carbon-900 text-white shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-semibold text-white">
              📢
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-carbon-200/70">Notifications</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Notification Center</h2>
              <p className="mt-1 text-sm text-carbon-100/75">System alerts and important updates.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <NotificationInbox accessToken={accessToken} />
        </div>
      </aside>
    </div>
  );
};
