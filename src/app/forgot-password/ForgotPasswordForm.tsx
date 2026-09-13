// src/app/forgot-password/ForgotPasswordForm.tsx
//
// Client component for the forgot-password page.
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  resetPassword,
  requestPasswordReset,
} from "@/server/actions/forgot-password";

interface ForgotPasswordFormProps {
  initialSession: { isAuthenticated: boolean; email?: string };
}

export function ForgotPasswordForm({ initialSession }: ForgotPasswordFormProps) {
  const [mode, setMode] = useState<"self" | "email">(
    initialSession.isAuthenticated ? "self" : "email",
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Self-service fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Email-reset fields
  const [email, setEmail] = useState(initialSession.email ?? "");

  function clearSelfFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function clearEmailField() {
    setEmail("");
  }

  function handleSelfService() {
    startTransition(async () => {
      setResult(null);
      const outcome = await resetPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      setResult(outcome);
      if (outcome.success) {
        clearSelfFields();
      }
    });
  }

  function handleEmailReset() {
    startTransition(async () => {
      setResult(null);
      const outcome = await requestPasswordReset({ email: email.trim() });
      setResult(outcome);
      if (outcome.success) {
        clearEmailField();
      }
    });
  }

  const isPending = pending;
  const ok = result?.success;
  const err = result?.error;

  // Self-service rendering
  if (mode === "self") {
    return (
      <div className="space-y-5">
        <p className="text-sm text-emerald-800">
          Verify your current password, then choose a new one. You&apos;ll stay
          signed in afterwards.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-emerald-900">
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isPending || !!ok}
              className="min-w-0 rounded-md border border-emerald-700 bg-white px-3.5 py-2.5 text-sm text-emerald-900 shadow-sm ring-1 ring-inset ring-emerald-700/10 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-emerald-900">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isPending || !!ok}
              className="min-w-0 rounded-md border border-emerald-700 bg-white px-3.5 py-2.5 text-sm text-emerald-900 shadow-sm ring-1 ring-inset ring-emerald-700/10 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <p className="text-xs text-emerald-700">
              At least 8 characters. Must be different from your current password.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-emerald-900">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isPending || !!ok}
              className="min-w-0 rounded-md border border-emerald-700 bg-white px-3.5 py-2.5 text-sm text-emerald-900 shadow-sm ring-1 ring-inset ring-emerald-700/10 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
              placeholder="Re-enter the new password"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSelfService}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Updating password…" : "Update my password"}
            </button>

          {ok && (
            <p className="text-sm text-emerald-700">{result.message}</p>
          )}
          {err && <p className="text-sm text-emerald-700">{err}</p>}

          <button
            type="button"
            onClick={() => {
              setMode("email");
              clearSelfFields();
            }}
            className="text-sm text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
          >
            I can&apos;t sign in at all—reset by email instead
          </button>
        </div>
      </div>
    );
  }

  // Email-reset rendering
  return (
    <div className="space-y-5">
      <p className="text-sm text-emerald-800">
        Enter the email address you use to sign in. If it&apos;s associated with
        an account, we&apos;ll send a link to set a new password.
      </p>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-emerald-900">
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending || !!ok}
          className="min-w-0 rounded-md border border-emerald-700 bg-white px-3.5 py-2.5 text-sm text-emerald-900 shadow-sm ring-1 ring-inset ring-emerald-700/10 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleEmailReset}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Sending instructions…" : "Send reset instructions"}
        </button>

        {ok && (
          <p className="text-sm text-emerald-700">{result.message}</p>
        )}
        {err && <p className="text-sm text-emerald-700">{err}</p>}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href="/login"
          className="text-sm text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
        >
          Back to sign in
        </Link>
        <button
          type="button"
          onClick={() => {
            setMode("self");
            clearEmailField();
          }}
          className="text-sm text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
        >
          Actually, I can still sign in—change my password instead
        </button>
      </div>
    </div>
  );
}

