"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { getBrowserSupabaseClient } from "@/lib/supabase";
import { getAuthRoleLabel, normalizeAuthRole, type AuthRole } from "@/types/auth";

type AuthMode = "login" | "authenticated";

type AuthFormState = {
  email: string;
  password: string;
};

type AuthPortalProps = {
  redirectTo?: string;
};

const defaultFormState: AuthFormState = {
  email: "",
  password: "",
};

const roleCopy: Record<AuthRole, { headline: string; body: string; accent: string }> = {
  super_admin: {
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

export function AuthPortal({ redirectTo = "/dashboard" }: AuthPortalProps) {
  const router = useRouter();
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
    if (data.session) {
      router.replace(redirectTo);
    }
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-md">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          {mode === "authenticated" && session ? (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                Signed in as {getAuthRoleLabel(role)}
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-slate-950">{roleMeta.headline}</h2>
                <p className="text-base leading-6 text-slate-600">{roleMeta.body}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <p className="font-medium text-slate-900">Session</p>
                <p className="mt-2 break-all">{session.user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635BFF] text-xs font-bold text-white">ES</span>
                  <span className="text-sm font-bold tracking-tight text-slate-900">ERDA Scholar</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-950">Welcome back</h2>
                <p className="text-sm text-slate-500">Sign in to your account to continue</p>
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
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
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
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    required
                  />
                </label>
              </div>

              {error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center rounded-lg bg-[#635BFF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5148e5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>

              <p className="text-center text-xs text-slate-400">By continuing, you agree to the system access policy.</p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
