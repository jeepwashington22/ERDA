// src/server/actions/update-user-profile.ts
//
// Server Actions for the signed-in user's own profile:
//   - updateUserProfileInfo : edit their display name (user_profiles.full_name)
//   - changeUserPassword    : change their Supabase auth password
//
// SECURITY MODEL (mirrors the other actions in this folder):
// 1. "use server" — everything runs server-side only.
// 2. The caller is always the session owner: we read the user id from the
//    Supabase session, NEVER from client input, so nobody can edit or change
//    the password of another account.
// 3. Password change re-authenticates with the CURRENT password first, so a
//    stolen unlocked session alone cannot lock the real owner out.
// 4. Role/active status is re-checked from the database, not client metadata.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { queryPostgres } from "@/server/lib/postgres";

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

const MIN_PASSWORD_LENGTH = 8;

/** Shared gate: session + verified active profile row for the caller. */
type CallerProfile = {
  supabase: SupabaseClientForProfileActions;
  userId: string;
  email: string;
};

type GateResult =
  | { error: string }
  | { caller: CallerProfile };

interface SupabaseClientForProfileActions {
  auth: {
    getUser(): Promise<{ data: { user: { id: string; email?: string } | null }; error?: Error | null }>;
    signInWithPassword(params: { email: string; password: string }): Promise<{ data: { user?: { id: string }; session?: unknown }; error?: Error | null }>;
    updateUser(params: { password?: string; data?: Record<string, unknown> }): Promise<{ data?: unknown; error?: Error | null }>;
  };
}

// ---- Runtime bridge ----
type SupabaseClientShape = {
  auth: {
    getUser(): unknown;
    signInWithPassword(params: unknown): unknown;
    updateUser(params: unknown): unknown;
  };
};

function toSupabaseClient(client: unknown): SupabaseClientForProfileActions {
  if (!client || typeof client !== "object") {
    throw new Error("requireActiveCaller: supabase client is not an object");
  }
  return client as SupabaseClientForProfileActions & SupabaseClientShape;
}

async function requireActiveCaller(): Promise<GateResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "Not authenticated." };
  }

  let profile: { is_active: boolean } | null = null;
  try {
    const rows = await queryPostgres<{ is_active: boolean }>(
      "select is_active from user_profiles where id = $1 limit 1",
      [data.user.id],
    );
    profile = rows[0] ?? null;
  } catch (err) {
    console.error("update-user-profile: failed to load caller profile:", err);
  }

  if (!profile || !profile.is_active) {
    return { error: "Could not verify your account." };
  }

  const client = toSupabaseClient(supabase);
  return {
    caller: {
      supabase: client,
      userId: data.user.id,
      email: data.user.email ?? "",
    },
  };
}

export type UpdateUserProfileInfoInput = {
  fullName: string;
};

/** Edit the signed-in user's own display name. */
export async function updateUserProfileInfo(
  input: UpdateUserProfileInfoInput,
): Promise<UpdateProfileResult> {
  const gate = await requireActiveCaller();
  if ("error" in gate) return { success: false, error: gate.error };

  const { caller } = gate;
  const fullName = input.fullName?.trim();
  if (!fullName) {
    return { success: false, error: "Full name is required." };
  }
  if (fullName.length > 120) {
    return { success: false, error: "Full name is too long (max 120 characters)." };
  }

  // 1. Update the app's user_profiles row (source of truth for the UI).
  const rows = await queryPostgres(
    "update user_profiles set full_name = $2 where id = $1",
    [caller.userId, fullName],
  );

  // 2. Keep Supabase auth metadata in sync (best effort — profiles row above
  //    is authoritative, and createUserAccount stores the name there too).
  const { error: metaError } = await caller.supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (metaError) {
    console.warn("updateUserProfileInfo: auth metadata sync failed:", metaError.message);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard"); // topbar shows the user's name
  void rows;
  return { success: true };
}

export type ChangeUserPasswordInput = {
  currentPassword: string;
  newPassword: string;
};

/** Change the signed-in user's own password (requires the current one). */
export async function changeUserPassword(
  input: ChangeUserPasswordInput,
): Promise<UpdateProfileResult> {
  const gate = await requireActiveCaller();
  if ("error" in gate) return { success: false, error: gate.error };

  const { caller } = gate;
  const { currentPassword, newPassword } = input;
  if (!currentPassword) {
    return { success: false, error: "Your current password is required." };
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (newPassword === currentPassword) {
    return { success: false, error: "The new password must be different from the current one." };
  }

  // ---- Re-authenticate with the current password before allowing a change.
  // This uses the same anon-key server client; a successful signInWithPassword
  // proves the caller actually knows the account's current password.
  const { error: signInError } = await caller.supabase.auth.signInWithPassword({
    email: caller.email,
    password: currentPassword,
  });
  if (signInError) {
    return { success: false, error: "Your current password is incorrect." };
  }

  const { error: updateError } = await caller.supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    console.error("changeUserPassword: updateUser failed:", updateError);
    return { success: false, error: updateError.message ?? "Failed to change password." };
  }

  revalidatePath("/profile");
  return { success: true };
}
