"use client";

export function LoadingBar({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-2 border-[rgb(14,165,233)]" aria-label="Loading">
      </div>
    </div>
  );
}