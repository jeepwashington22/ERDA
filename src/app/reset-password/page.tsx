// src/app/reset-password/page.tsx
//
// Public page where a password-recovery link lands. The recovery link
// redirects here with auth tokens in the URL hash; the browser Supabase
// client consumes them (detectSessionInUrl) and establishes a session.
// This route lives OUTSIDE the (app) group and is exempted from the
// middleware auth gate, like /login and /forgot-password.

import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Set a new password | Erda Scholar System",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-emerald-700 bg-white/95 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-5 flex flex-col gap-1">
          <h1 className="text-3xl font-semibold text-emerald-900">
            Set a new password
          </h1>
          <p className="text-sm text-emerald-800">
            Choose a new password for your account.
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}