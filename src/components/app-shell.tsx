"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { LogoutButton } from "./logout-button";

type IconName = "grid" | "users" | "file" | "settings" | "help" | "moon" | "chevron";

type NavigationItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
};

const navigationGroups: { title: string; items: NavigationItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "grid" },
      { href: "/students", label: "Students", icon: "users", badge: "250" },
    ],
  },
  {
    title: "Administration",
    items: [{ href: "/admin/accounts", label: "Accounts", icon: "file" }],
  },
];

type AppShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
};

function NavIcon({ name, active = false }: { name: IconName; active?: boolean }) {
  const stroke = active ? "#635BFF" : "currentColor";
  const common = { fill: "none", stroke, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (name === "grid") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><rect {...common} x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect {...common} x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect {...common} x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect {...common} x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;
  }

  if (name === "users") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><circle {...common} cx="9" cy="8" r="3" /><path {...common} d="M3.8 19c.5-3 2.3-4.8 5.2-4.8s4.7 1.8 5.2 4.8" /><path {...common} d="M15 5.5a3 3 0 0 1 0 5.7M16.1 14.4c2.4.4 3.8 1.9 4.1 4.6" /></svg>;
  }

  if (name === "file") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path {...common} d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z" /><path {...common} d="M14 3.5V8h4M9 12h6M9 16h6" /></svg>;
  }

  if (name === "settings") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><circle {...common} cx="12" cy="12" r="3" /><path {...common} d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3h-.2a1.8 1.8 0 0 0-.9 3Z" /></svg>;
  }

  if (name === "help") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="M9.7 9a2.4 2.4 0 1 1 4 1.8c-1 .7-1.7 1.2-1.7 2.5M12 16.5h.01" /></svg>;
  }

  if (name === "moon") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path {...common} d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" /></svg>;
  }

  return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path {...common} d="m8 10 4 4 4-4" /></svg>;
}

export function AppShell({ title, description, children, eyebrow = "Protected workspace" }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const currentPath = "/dashboard";

  return (
    <main className={`h-screen w-screen text-slate-900 transition-colors overflow-hidden ${darkMode ? "bg-slate-100" : "bg-[#f5f6fa]"}`}>
      <div className="flex h-full w-full gap-0">
        <aside className={`hidden h-screen shrink-0 flex-col overflow-y-auto rounded-none border-r border-white bg-white p-3 transition-[width] duration-300 lg:flex ${collapsed ? "w-[88px]" : "w-[272px]"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden rounded-2xl px-2 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#635BFF] text-sm font-bold text-white shadow-[0_8px_20px_rgba(99,91,255,0.25)]">ES</span>
              {!collapsed && <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-slate-900">ERDA Scholar</span>}
            </Link>
            <button onClick={() => setCollapsed((value) => !value)} className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 xl:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <span className={`transition-transform ${collapsed ? "rotate-180" : ""}`}><NavIcon name="chevron" /></span>
            </button>
          </div>

          <div className={`mt-5 rounded-2xl bg-[#f1f2ff] p-3 ${collapsed ? "flex justify-center" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-indigo-500 text-sm font-bold text-white ring-4 ring-white">AS</div>
              {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">Admin Staff</p><p className="truncate text-xs text-slate-500">Administrator</p></div>}
              {!collapsed && <button className="ml-auto text-slate-400 transition hover:text-slate-700" aria-label="Open profile actions"><NavIcon name="chevron" /></button>}
            </div>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto">
            {!collapsed && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Main menu</p>}
            <nav className="space-y-1.5" aria-label="Primary navigation">
              {navigationGroups[0].items.map((item) => {
                const isActive = currentPath === item.href;
                return <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${collapsed ? "justify-center" : ""} ${isActive ? "bg-[#f1f2ff] text-[#635BFF]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><NavIcon name={item.icon} active={isActive} />{!collapsed && <span className="flex-1">{item.label}</span>}{item.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white text-[#635BFF]" : "bg-slate-100 text-slate-500"}`}>{item.badge}</span>}</Link>;
              })}
            </nav>

            <div className="my-6 border-t border-slate-100" />
            {!collapsed && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Manage</p>}
            <nav className="space-y-1.5" aria-label="Administration navigation">
              {navigationGroups[1].items.map((item) => <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${collapsed ? "justify-center" : ""} ${currentPath === item.href ? "bg-[#f1f2ff] text-[#635BFF]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><NavIcon name={item.icon} active={currentPath === item.href} />{!collapsed && <span>{item.label}</span>}</Link>)}
            </nav>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <button onClick={() => setDarkMode((value) => !value)} title={collapsed ? "Toggle theme" : undefined} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 ${collapsed ? "justify-center" : ""}`}><NavIcon name="moon" />{!collapsed && <><span className="flex-1 text-left">Dark mode</span><span className={`h-5 w-9 rounded-full p-0.5 transition ${darkMode ? "bg-[#635BFF]" : "bg-slate-200"}`}><span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${darkMode ? "translate-x-4" : ""}`} /></span></>}</button>
            <Link href="/settings" title={collapsed ? "Settings" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 ${collapsed ? "justify-center" : ""}`}><NavIcon name="settings" />{!collapsed && <span>Settings</span>}</Link>
            <LogoutButton className={`mt-1 flex rounded-xl border-0 bg-transparent px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 ${collapsed ? "w-full justify-center" : "w-full"}`} />
          </div>
        </aside>

        <section className="min-w-0 flex-1 flex flex-col h-full">
          <header className="rounded-none border-b border-slate-200/80 bg-white/90 px-6 py-3 shadow-none shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            </div>
          </header>
          <div className="flex-1 overflow-hidden">{children}</div>
        </section>
      </div>
    </main>
  );
}
