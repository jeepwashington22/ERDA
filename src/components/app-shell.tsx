import type { ReactNode } from "react";
import Link from "next/link";

import { LogoutButton } from "./logout-button";

const navigationGroups = [
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/students", label: "Students" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/accounts", label: "Accounts" },
    ],
  },
];

type AppShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
};

export function AppShell({ title, description, children, eyebrow = "Protected workspace" }: AppShellProps) {
  const currentPath = "/dashboard";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] p-3 text-slate-900 sm:p-4 lg:p-5">
      <div className="flex min-h-[calc(100vh-1.5rem)] w-full gap-5">
        <aside className="hidden w-80 shrink-0 flex-col justify-between rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_30px_120px_rgba(15,23,42,0.24)] lg:flex">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">ERDA Scholar System</p>
              <h1 className="mt-3 text-2xl font-semibold leading-tight">Internal operations console</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Fast navigation for account administration, student records, and scholarship monitoring.
              </p>
            </div>

            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {group.title}
                </h3>
                <nav className="space-y-2">
                  {group.items.map((item) => {
                    const isActive = currentPath === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                          isActive
                            ? "bg-cyan-400 text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.25)]"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-4 border-t border-white/10 pt-5">
            <LogoutButton className="w-full justify-center rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10" />
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
                <span className="text-xs font-bold text-cyan-200">ER</span>
              </div>
              <p className="text-sm font-semibold text-slate-200">
                ERDA <span className="font-normal text-slate-500">Scholar System</span>
              </p>
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-5">
          <header className="rounded-[2rem] border border-slate-200/80 bg-white/90 px-6 py-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:px-8 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p>
                <h2 className="text-4xl font-bold tracking-tight text-slate-950">{title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                {navigationGroups.flatMap((g) => g.items).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white active:bg-slate-100"
                  >
                    {item.label}
                  </Link>
                ))}
                <LogoutButton className="rounded-full bg-slate-950 text-white hover:bg-slate-800" />
              </div>
            </div>
          </header>

          <div className="space-y-6">{children}</div>
        </section>
      </div>
    </main>
  );
}