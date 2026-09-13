"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import { getBrowserSupabaseClient } from "@/lib/supabase";
import { completePasswordReset } from "@/server/actions/forgot-password";

type Status = "checking" | "ready" | "invalid" | "done";

const inputClass =
  "min-w-0 rounded-md border border-emerald-700 bg-white px-3.5 py-2.5 text-sm text-emerald-900 shadow-sm ring-1 ring-inset ring-emerald-700/10 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";
const linkClass = "text-sm text-emerald-700 underline underline-offset-4 hover:text-emerald-800";
const buttonClass =
  "inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50";

export function ResetPasswordForm() {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The recovery link lands here with tokens in the URL hash. The browser
  // Supabase client consumes them on first auth call (detectSessionInUrl),
  // so poll briefly until the session appears, then either show the form
  // or explain the link was invalid/expired.
  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function checkSession(attempt: number) {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setStatus("ready");
        return;
      }
      if (attempt < 5) {
        setTimeout(() => {
          if (!cancelled) void checkSession(attempt + 1);
        }, 400);
        return;
      }
      setStatus("invalid");
    }

    void checkSession(0);
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit() {
    setError(null);
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    startTransition(async () => {
      const outcome = await completePasswordReset({ newPassword, confirmPassword });
      if (outcome.success) {
        setStatus("done");
      } else {
        setError(outcome.error);
      }
    });
  }

  if (status === "checking") {
    return <p className="text-sm text-emerald-800">Verifying your recovery link…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-800">
          This reset link is invalid or has expired. Recovery links can only be
          used once.
        </p>
        <Link href="/forgot-password" className={linkClass}>
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-700">
          Your password has been updated. Use your new password to sign in.
        </p>
        <Link href="/login" className={linkClass}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-emerald-800">
        Your recovery link is verified. Choose a new password below.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-emerald-900">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={pending}
            className={inputClass}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-emerald-900">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={pending}
            className={inputClass}
            placeholder="Repeat the new password"
            autoComplete="new-password"
          />
        </div>
      </div>

      <button type="button" onClick={handleSubmit} disabled={pending} className={buttonClass}>
        {pending ? "Updating password…" : "Set new password"}
      </button>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}