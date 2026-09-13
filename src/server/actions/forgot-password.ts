// src/server/actions/forgot-password.ts
//
// Forgot-password flow for ERDA Scholar System users.
//
// Two recovery paths:
//  1. Self-service (authenticated): verify current password, then set a new
//     password. This works even when the browser session is stale.
//  2. Email reset (unauthenticated): the server uses the Supabase Admin
//     client to trigger a password-reset email. This only ever runs server
//     side; the service_role client is never sent to the browser.
//
// SECURITY MODEL
//   - Identity/source of truth is always read from the Supabase session on
//     server actions.
//   - All input is trimmed/validated before touching Supabase or Postgres.
//   - The caller's role is NOT checked here — password recovery is an
//     account-level operation.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createPrimarySupabaseClient } from "@/server/lib/supabase";

export type ForgotPasswordResult =
  | { success: true; message?: string }
  | { success: false; error: string };

const MIN_PASSWORD_LENGTH = 8;

// ----------------------------------------------------------------
// 1. Self-service (authenticated): verify current password, set new one
// ----------------------------------------------------------------

export type ResetPasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ForgotPasswordResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { success: false, error: "Not authenticated." };
  }

  const { currentPassword, newPassword, confirmPassword } = input;

  if (!currentPassword) {
    return { success: false, error: "Your current password is required." };
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: "The new passwords do not match." };
  }
  if (newPassword === currentPassword) {
    return { success: false, error: "The new password must be different from the current one." };
  }

  // Verify the caller actually knows the current password.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: data.user.email ?? "",
    password: currentPassword,
  });
  if (signInError) {
    return { success: false, error: "Your current password is incorrect." };
  }

  // Rotate the password; Supabase will sign the user out of other sessions
  // automatically. The current session is re-synced by Next.js SSR.
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    console.error("resetPassword: updateUser failed:", updateError);
    return { success: false, error: updateError.message ?? "Failed to change password." };
  }

  revalidatePath("/profile");
  return {
    success: true,
    message:
      "Your password has been updated. You are now signed in with the new password.",
  };
}

// ----------------------------------------------------------------
// 2. Email-based reset (unauthenticated): trigger Supabase reset email
// ----------------------------------------------------------------

export type RequestPasswordResetInput = {
  email: string;
};

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<ForgotPasswordResult> {
  const { email } = input;
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  let adminClient;
  try {
    adminClient = createPrimarySupabaseClient();
  } catch (err) {
    console.error("requestPasswordReset: cannot create admin client:", err);
    return {
      success: false,
      error:
        "Service is not configured to send password reset emails yet. Please try the self-service option above.",
    };
  }

  // Trigger a password-reset email. Supabase will send a link that allows
  // the user to set a new password. The link redirects back to our
  // /reset-password page, where the recovery session is consumed and the
  // user picks a new password.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error: emailError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: trimmed,
    options: { redirectTo: `${siteUrl}/reset-password` },
  });
  if (emailError) {
    console.error("requestPasswordReset: generateLink failed:", emailError);
    return {
      success: false,
      error: emailError.message ?? "Failed to send reset instructions.",
    };
  }

  return {
    success: true,
    message:
      "If that email belongs to an account, reset instructions are on their way. Check your inbox and spam folder — note that Supabase's built-in dev SMTP is rate-limited (a few emails per hour), so delivery may be delayed.",
  };
}

// ----------------------------------------------------------------
// 3. Lightweight helper used by the forgot-password page to decide mode
// ----------------------------------------------------------------

export type CurrentSessionResult = {
  isAuthenticated: boolean;
  email?: string;
};

export async function getCurrentSessionStatus(): Promise<CurrentSessionResult> {
  const supabase = await createSupabaseServerClient();
  let isAuthenticated = false;
  let email = "";
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      isAuthenticated = true;
      email = data.user.email ?? "";
    }
  } catch {
    isAuthenticated = false;
  }
  return { isAuthenticated, email: isAuthenticated ? email : undefined };
}

// ----------------------------------------------------------------
// 4. Complete a password recovery: set a new password using the
//    session established by the recovery link (/reset-password page).
//    The current password is NOT required here — identity is proven
//    by possession of the one-time recovery link itself.
// ----------------------------------------------------------------

export type CompletePasswordResetInput = {
  newPassword: string;
  confirmPassword: string;
};

export async function completePasswordReset(
  input: CompletePasswordResetInput,
): Promise<ForgotPasswordResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return {
      success: false,
      error: "No active reset session. Request a new reset link from the forgot-password page.",
    };
  }

  const { newPassword, confirmPassword } = input;

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: "The passwords do not match." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    console.error("completePasswordReset: updateUser failed:", updateError);
    return { success: false, error: updateError.message ?? "Failed to set the new password." };
  }

  // End the recovery session; the user signs in fresh with the new password.
  await supabase.auth.signOut();

  revalidatePath("/profile");
  return {
    success: true,
    message: "Your password has been updated. Please sign in with your new password.",
  };
}
