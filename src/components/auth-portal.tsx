"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getBrowserSupabaseClient } from "@/lib/supabase";
import { getAuthRoleLabel, normalizeAuthRole, type AuthRole } from "@/types/auth";

type AuthMode = "login" | "authenticated";

type AuthFormState = {
  email: string;
  password: string;
};

const defaultFormState: AuthFormState = {
  email: "",
  password: "",
};

const roleCopy: Record<AuthRole, { headline: string; body: string; accent: string }> = {
  superadmin: {
    headline: "Platform control center",
    body: "Manage institutional access, policy changes, and high-trust operations from a single console.",
    accent: "From system oversight to emergency access, keep the platform aligned.",
  },
  admin: {
    headline: "Operational command",
    body: "Approve workflows, manage records, and monitor day-to-day execution across teams.",
    accent: "The admin view emphasizes coordination, governance, and accountability.",
  },
  staff: {
    headline: "Daily workspace",
    body: "Handle the routine tasks that keep the scholarship system moving without exposing higher-level controls.",
    accent: "Staff users land in the streamlined operational view by default.",
  },
};

function getSessionRole(session: Session | null): AuthRole {
  const metadataRole = session?.user.user_metadata?.role ?? session?.user.app_metadata?.role;

  return normalizeAuthRole(typeof metadataRole === "string" ? metadataRole : null);
}

export function AuthPortal() {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AuthRole>("staff");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AuthFormState>(defaultFormState);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      const nextSession = data.session;
      setSession(nextSession);
      setRole(getSessionRole(nextSession));
      setMode(nextSession ? "authenticated" : "login");
      setLoading(false);
    }

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setRole(getSessionRole(nextSession));
      setMode(nextSession ? "authenticated" : "login");
      setLoading(false);
      setError(null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (loginError) {
      setError(loginError.message);
      setSubmitting(false);
      return;
    }

    setSession(data.session);
    setRole(getSessionRole(data.session));
    setMode(data.session ? "authenticated" : "login");
    setForm(defaultFormState);
    setSubmitting(false);
  }

  async function handleLogout() {
    setSubmitting(true);
    setError(null);
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
    }

    setSubmitting(false);
  }

  const roleMeta = roleCopy[role];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(17,24,39,0.12),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-6 text-slate-700">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-6 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          Loading Supabase session...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-[0_30px_120px_rgba(15,23,42,0.24)]">
          <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92)_55%,rgba(8,47,73,0.94))] px-8 py-10 sm:px-12 sm:py-12">
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                Erda Scholar System
              </div>
              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">Supabase auth</p>
                <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  Secure login with role-aware access for superadmin, admin, and staff.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  This portal connects your Supabase-backed environment variables, signs users in against the
                  database auth system, and resolves the active role from user metadata.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {(["superadmin", "admin", "staff"] as AuthRole[]).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                >
                  <p className="text-sm font-semibold text-white">{getAuthRoleLabel(item)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{roleCopy[item].accent}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          {mode === "authenticated" && session ? (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                Signed in as {getAuthRoleLabel(role)}
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold text-slate-950">{roleMeta.headline}</h2>
                <p className="max-w-xl text-base leading-7 text-slate-600">{roleMeta.body}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                <p className="font-medium text-slate-900">Session</p>
                <p className="mt-2 break-all">{session.user.email}</p>
                <p className="mt-1">Role source: user metadata or app metadata.</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Login</p>
                <h2 className="text-3xl font-semibold text-slate-950">Welcome back</h2>
                <p className="max-w-lg text-base leading-7 text-slate-600">
                  Sign in with your Supabase auth account. The dashboard will adapt to the assigned role.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Email
                  <input
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    type="email"
                    autoComplete="email"
                    placeholder="name@school.edu"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                    required
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  Password
                  <input
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                    required
                  />
                </label>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
                <div className="rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Role-aware session routing after auth
                </div>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
