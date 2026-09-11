"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "./logout-button";

type IconName = "grid" | "users" | "file" | "settings" | "help" | "moon" | "chevron" | "bell";

type NavigationItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
};

const navigationGroups: { title: string; items: NavigationItem[] }[] = [
  {
    title: "Main menu",
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
  title?: string;
  description?: string;
  children: ReactNode;
  eyebrow?: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
};

function NavIcon({ name, active = false }: { name: IconName; active?: boolean }) {
  const stroke = active ? "#059669" : "currentColor";
  const common = { fill: "none", stroke, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (name === "grid") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><rect {...common} x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect {...common} x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect {...common} x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect {...common} x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;
  }

  if (name === "users") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><circle {...common} cx="9" cy="8" r="3" /><path {...common} d="M3.8 19c.5-3 2.3-4.8 5.2-4.8s4.7 1.8 5.2 4.8" /><path {...common} d="M15 5.5a3 3 0 0 1 0 5.7M16.1 14.4c2.4.4 3.8 1.9 4.1 4.6" /></svg>;
  }

  if (name === "file") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path {...common} d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z" /><path {...common} d="M14 3.5V8h4M9 12h6M9 16h6" /></svg>;
  }

  if (name === "settings") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><circle {...common} cx="12" cy="12" r="3" /><path {...common} d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3h-.2a1.8 1.8 0 0 0-.9 3Z" /></svg>;
  }

  if (name === "help") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="M9.7 9a2.4 2.4 0 1 1 4 1.8c-1 .7-1.7 1.2-1.7 2.5M12 16.5h.01" /></svg>;
  }

  if (name === "moon") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path {...common} d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" /></svg>;
  }

  if (name === "bell") {
    return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true"><path {...common} d="M6 10.5a6 6 0 0 1 12 0c0 3.4.8 5 1.6 5.9.3.3.1.9-.4.9H4.8c-.5 0-.7-.6-.4-.9.8-.9 1.6-2.5 1.6-5.9Z" /><path {...common} d="M10 19.5a2 2 0 0 0 4 0" /></svg>;
  }

  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true"><path {...common} d="m8 10 4 4 4-4" /></svg>;
}

export function AppShell({
  title,
  description,
  children,
  eyebrow = "Protected workspace",
  userRole,
  userName,
  userEmail,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");
    const pathname = usePathname();

  // The shared (app) layout does not pass a title, so derive it from the
  // active segment to keep the header accurate on every tab.
  const derivedTitle = pathname?.startsWith("/admin/accounts")
    ? "Account management"
    : pathname?.startsWith("/students")
      ? "Students"
      : "Dashboard";
  const headerTitle = title ?? derivedTitle;

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  function isActivePath(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : userEmail
      ? userEmail.slice(0, 2).toUpperCase()
      : "US";

  const roleDisplay = userRole === "super_admin"
    ? "Super Admin"
    : userRole === "admin"
      ? "Admin"
      : "Staff";

  const nameDisplay = userName || userEmail || "User";
  const firstName = userName ? userName.split(" ")[0] : nameDisplay.split("@")[0];

  const showAdminMenu = userRole && ["admin", "super_admin"].includes(userRole);

  function navItemClass(isActive: boolean) {
    return [
      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
      collapsed ? "justify-center" : "",
      isActive
        ? "bg-emerald-50 text-emerald-700"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
    ].join(" ");
  }

  return (
    <main className={`h-screen w-screen text-slate-900 transition-colors overflow-hidden ${darkMode ? "bg-slate-100" : "bg-[#f7f9f8]"}`}>
      <div className="flex h-full w-full gap-0">
        <aside className={`hidden h-screen shrink-0 flex-col overflow-y-auto rounded-none border-r border-slate-100 bg-white p-2.5 transition-[width] duration-300 lg:flex ${collapsed ? "w-[72px]" : "w-[224px]"}`}>
          {/* Brand row */}
          <div className={`flex items-center px-1 py-1.5 ${collapsed ? "justify-center" : "justify-between"}`}>
            <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden rounded-lg">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-[0_4px_12px_rgba(5,150,105,0.25)]">
                ES
              </span>
              {!collapsed && <span className="whitespace-nowrap text-[13px] font-bold tracking-tight text-slate-900">ERDA Scholar</span>}
            </Link>
            <button
              onClick={() => setCollapsed((value) => !value)}
              className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 xl:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className={`text-[10px] transition-transform ${collapsed ? "rotate-180" : ""}`}>Â«</span>
            </button>
          </div>

          {/* Profile card */}
          <div className={`mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2 ${collapsed ? "flex justify-center" : ""}`}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-[10px] font-bold text-white ring-2 ring-white">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{nameDisplay}</p>
                  <p className="truncate text-[11px] text-slate-500">{roleDisplay}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav groups */}
          <div className="mt-4 flex-1 overflow-y-auto">
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {navigationGroups[0].title}
              </p>
            )}
            <nav className="space-y-0.5" aria-label="Primary navigation">
              {navigationGroups[0].items.map((item) => {
                const isActive = isActivePath(item.href);
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={navItemClass(isActive)}>
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-emerald-600" />
                    )}
                    <NavIcon name={item.icon} active={isActive} />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {item.badge && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {showAdminMenu && (
              <>
                <div className="my-3 border-t border-slate-100" />
                {!collapsed && (
                  <p className="mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {navigationGroups[1].title}
                  </p>
                )}
                <nav className="space-y-0.5" aria-label="Administration navigation">
                  {navigationGroups[1].items.map((item) => {
                    const isActive = isActivePath(item.href);
                    return (
                      <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={navItemClass(isActive)}>
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-emerald-600" />
                        )}
                        <NavIcon name={item.icon} active={isActive} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </nav>
              </>
            )}
          </div>

          {/* General / footer group */}
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">General</p>
            )}
            <div className="space-y-0.5">
              <button
                onClick={() => setDarkMode((value) => !value)}
                title={collapsed ? "Toggle theme" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 ${collapsed ? "justify-center" : ""}`}
              >
                <NavIcon name="moon" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Dark mode</span>
                    <span className={`h-4 w-7 rounded-full p-0.5 transition ${darkMode ? "bg-emerald-600" : "bg-slate-200"}`}>
                      <span className={`block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${darkMode ? "translate-x-3" : ""}`} />
                    </span>
                  </>
                )}
              </button>

              <Link
                href="/settings"
                title={collapsed ? "Settings" : undefined}
                className={navItemClass(isActivePath("/settings"))}
              >
                <NavIcon name="settings" active={isActivePath("/settings")} />
                {!collapsed && <span>Settings</span>}
              </Link>

              <Link
                href="/help"
                title={collapsed ? "Help desk" : undefined}
                className={navItemClass(isActivePath("/help"))}
              >
                <NavIcon name="help" active={isActivePath("/help")} />
                {!collapsed && <span>Help desk</span>}
              </Link>

              <LogoutButton
                className={`flex items-center gap-2.5 rounded-lg border-0 bg-transparent px-2.5 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 ${collapsed ? "w-full justify-center" : "w-full"}`}
              />
            </div>
          </div>
        </aside>

               <section className="min-w-0 flex-1 flex flex-col h-full min-h-0">
          <header className="rounded-none border-b border-slate-200/80 bg-white/90 px-6 py-3 shadow-none shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400">
                  {greeting}, {firstName}
                </p>
                <h2 className="truncate text-sm font-semibold text-slate-900">{headerTitle}</h2>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen((value) => !value);
                      setProfileOpen(false);
                    }}
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Notifications"
                  >
                    <NavIcon name="bell" />
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
                      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Notifications
                      </p>
                      <p className="rounded-lg px-2 py-6 text-center text-xs text-slate-400">You&apos;re all caught up.</p>
                    </div>
                  )}
                </div>

                <div className="h-6 w-px bg-slate-200" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((value) => !value);
                      setNotifOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-[11px] font-bold text-white ring-2 ring-white shadow-sm">
                      {initials}
                    </span>
                    <span className="hidden text-left sm:block">
                      <p className="max-w-[140px] truncate text-[13px] font-semibold leading-tight text-slate-900">{nameDisplay}</p>
                      <p className="text-[11px] leading-tight text-slate-500">{roleDisplay}</p>
                    </span>
                    <NavIcon name="chevron" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left text-sm shadow-lg">
                      <p className="truncate px-3 pb-1 pt-1.5 text-xs text-slate-400">{userEmail}</p>
                      <Link href="/settings" className="block rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50">
                        Settings
                      </Link>
                      <LogoutButton className="w-full rounded-lg border-0 bg-transparent px-3 py-2 text-left text-slate-600 transition hover:bg-red-50 hover:text-red-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </section>
      </div>
    </main>
  );
}