'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { getBrowserSupabaseClient } from "@/lib/supabase";
import { getAuthRoleLabel, normalizeAuthRole, type AuthRole } from "@/types/auth";
import { AuthPage, type AuthPageSubmitValues } from "@/components/ui/auth-page";

type AuthMode = "login" | "authenticated";

type AuthPortalProps = {
  redirectTo?: string;
  /**
   * Set by the server page when it has already verified there is no session.
   * Skips the initial loading state so the sign-in form renders on the server
   * (no client-side flash), while the session subscription still takes over
   * if a session appears.
   */
  assumeSignedOut?: boolean;
};

function getSessionRole(session: Session | null): AuthRole {
  const metadataRole = session?.user.user_metadata?.role ?? session?.user.app_metadata?.role;

  return normalizeAuthRole(typeof metadataRole === "string" ? metadataRole : null);
}

/**
 * Only internal, same-origin paths are honored after login. Anything else
 * (empty, external, protocol-relative "//host") falls back to /dashboard.
 */
function resolveRedirectTarget(target: string | undefined): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return "/dashboard";
}

export function AuthPortal({
  redirectTo = "/dashboard",
  assumeSignedOut = false,
}: AuthPortalProps) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AuthRole>("staff");
  const [loading, setLoading] = useState(!assumeSignedOut);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (assumeSignedOut) {
      // The server already verified there is no user; still subscribe so a
      // session created after mount (e.g. recovery link) is picked up.
      setLoading(false);
    } else {
      loadSession();
    }

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

  async function handleLogin(values: AuthPageSubmitValues) {
    setSubmitting(true);
    setError(null);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (loginError) {
      setError(loginError.message);
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      setError("Signed in, but no session was returned. Please try again.");
      setSubmitting(false);
      return;
    }

    setSession(data.session);
    setRole(getSessionRole(data.session));
    setMode("authenticated");
    setSubmitting(false);

    // Full navigation (not router.push) so the server middleware definitely
    // sees the freshly written session cookies when it authorizes the next
    // route. This is what makes "login → dashboard" reliable.
    window.location.assign(resolveRedirectTarget(redirectTo));
  }

  async function handleLogout() {
    setSubmitting(true);
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      setSubmitting(false);
      return;
    }

    setSession(null);
    setMode("login");
    setSubmitting(false);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    );
  }

  if (mode === "authenticated" && session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="bg-card w-full max-w-md space-y-6 rounded-xl border p-8 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">You&apos;re signed in</h2>
            <p className="text-muted-foreground text-sm">
              Redirecting you to your workspace…
            </p>
          </div>
          <div className="bg-muted/60 space-y-1 rounded-lg border p-4">
            <p className="text-sm font-semibold">{getAuthRoleLabel(role)}</p>
            <p className="text-muted-foreground break-all text-sm">{session.user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={submitting}
            className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Signing out…" : "Sign out"}
          </button>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <AuthPage
      onSubmit={handleLogin}
      submitting={submitting}
      error={error}
      homeHref="/"
      forgotPasswordHref="/forgot-password"
    />
  );
}
