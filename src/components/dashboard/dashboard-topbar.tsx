"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";

type Props = {
  userName: string;
  userRole: string;
  userEmail?: string | null;
  provinceOptions: { id: string; name: string }[];
  schoolYearOptions: string[];
};

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...iconProps} d="M6 9a6 6 0 1 1 12 0c0 3.5 1 5 1.5 5.8a.6.6 0 0 1-.5.9H5a.6.6 0 0 1-.5-.9C5 14 6 12.5 6 9Z" />
      <path {...iconProps} d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...iconProps} cx="12" cy="12" r="3" />
      <path {...iconProps} d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...iconProps} d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <path {...iconProps} d="M9 12h11m0 0-3-3m3 3-3 3" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...iconProps} d="m6 9 6 6 6-6" />
    </svg>
  );
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DashboardTopbar({
  userName,
  userRole,
  userEmail,
  provinceOptions,
  schoolYearOptions,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = initialsFrom(userName);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
      {/* Left: signed-in user */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-emerald-600">
            {userRole}
          </p>
        </div>
      </div>

      {/* Right: filters + notifications + profile */}
      <div className="flex items-center gap-2">
        <DashboardFilters provinceOptions={provinceOptions} schoolYearOptions={schoolYearOptions} />

        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />

        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <BellIcon className="h-4.5 w-4.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 items-center gap-1 rounded-lg px-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
              {initials}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-10 z-10 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
                {userEmail && <p className="truncate text-xs text-slate-500">{userEmail}</p>}
              </div>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
              >
                <SettingsIcon className="h-4 w-4 text-slate-400" />
                Settings
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogoutIcon className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}