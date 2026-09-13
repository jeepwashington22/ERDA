// src/app/forgot-password/page.tsx
//
// Self-serve password recovery for ERDA Scholar System users.
// Two modes: self-service (if you can still sign in) and email-based reset
// (if you can't sign in at all).

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentSessionStatus } from "@/server/actions/forgot-password";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  // If Supabase env vars are missing, treat as "not authenticated" but
  // still render the form — the action will fail fast and give a clear
  // message in that case.
  let sessionStatus:Awaited<ReturnType<typeof getCurrentSessionStatus>> | null = null;
  try {
    sessionStatus = await getCurrentSessionStatus();
  } catch {
    sessionStatus = null;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-emerald-700 bg-white/95 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-5 flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-emerald-900">
            Reset your password
          </h1>
          <p className="text-sm text-emerald-800">
            Choose how you'd like to reset your password.
          </p>
        </div>

        <ForgotPasswordForm initialSession={sessionStatus ?? { isAuthenticated: false }} />
      </div>
    </div>
  );
}
