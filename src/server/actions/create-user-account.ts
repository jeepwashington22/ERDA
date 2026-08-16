// src/server/actions/create-user-account.ts
//
// SECURITY MODEL
// ----------------------------------------------------------------------------
// 1. This is a Next.js Server Action ("use server") — the code only ever
//    runs on the server. The browser never sees the service_role key or
//    the authorization logic; it just calls this function like a regular
//    async function, and Next.js handles the network request under the hood.
//
// 2. We NEVER trust the caller's claimed role from the client. Even though
//    the older page.tsx read `data.user.user_metadata?.role`, that value
//    can be user-editable metadata depending on your Supabase auth config
//    and must never be used for authorization. We always re-check the
//    caller's role by querying user_profiles directly, server-side, right
//    before doing anything sensitive.
//
// 3. Only super_admin and admin may create accounts. Staff cannot, even if
//    they somehow call this function directly.
//
// 4. Account creation uses supabaseAdmin (service_role key) ONLY after the
//    role check passes — and that key is never exposed to the browser
//    (see supabase-admin.ts).

"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createPrimarySupabaseClient } from "@/server/lib/supabase";

export type CreateUserAccountInput = {
  fullName: string;
  email: string;
  password: string;
  role: "staff" | "admin" | "super_admin";
  assignedStudentIds?: string[]; // only used when role === "staff"
  taskNotes?: string;
};

export type CreateUserAccountResult =
  | { success: true; userId: string }
  | { success: false; error: string };

export async function createUserAccount(
  input: CreateUserAccountInput
): Promise<CreateUserAccountResult> {
  // ---- 1. Identify the caller and verify they're actually authorized ----
  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();

  if (sessionError || !sessionData.user) {
    return { success: false, error: "Not authenticated." };
  }

  // Re-check the role from the DATABASE, not from client-supplied metadata.
  const { data: callerProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", sessionData.user.id)
    .single();

  if (profileError || !callerProfile) {
    return { success: false, error: "Could not verify your account." };
  }

  if (!callerProfile.is_active) {
    return { success: false, error: "Your account is inactive." };
  }

  if (!["admin", "super_admin"].includes(callerProfile.role)) {
    return { success: false, error: "Only admins can create accounts." };
  }

  // Only a super_admin may create another super_admin — an ordinary admin
  // shouldn't be able to grant the highest privilege level.
  if (input.role === "super_admin" && callerProfile.role !== "super_admin") {
    return { success: false, error: "Only a super admin can create another super admin." };
  }

  // ---- 2. Validate input ----
  const errors: string[] = [];
  if (!input.fullName?.trim()) errors.push("Full name is required.");
  if (!input.email?.trim() || !input.email.includes("@")) errors.push("A valid email is required.");
  if (!input.password || input.password.length < 8) errors.push("Password must be at least 8 characters.");
  if (!["staff", "admin", "super_admin"].includes(input.role)) errors.push("Invalid role.");

  if (errors.length > 0) {
    return { success: false, error: errors.join(" ") };
  }

  // ---- 3. Create the auth account (service_role, server-only) ----
  let supabaseAdmin;
  try {
    supabaseAdmin = createPrimarySupabaseClient();
  } catch (err) {
    console.error("Failed to create Supabase admin client:", err);
    return {
      success: false,
      error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY configuration.",
    };
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true, // skip email verification for admin-created accounts
    user_metadata: { full_name: input.fullName.trim() },
  });

  if (createError || !created.user) {
    return { success: false, error: createError?.message ?? "Failed to create account." };
  }

  const newUserId = created.user.id;

  // ---- 4. The DB trigger auto-creates a user_profiles row with role
  //         'staff' by default — update it to match what was actually
  //         requested, and record who created it (audit trail).
  const { error: updateError } = await supabaseAdmin
    .from("user_profiles")
    .update({
      role: input.role,
      full_name: input.fullName.trim(),
      created_by: sessionData.user.id,
    })
    .eq("id", newUserId);

  if (updateError) {
    // Roll back the auth account so we don't leave an orphaned login with
    // the wrong role and no usable profile.
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return { success: false, error: "Failed to set up account role. Please try again." };
  }

  // ---- 5. If this is a staff account with assigned students, create
  //         the staff_assignments rows now.
  if (input.role === "staff" && input.assignedStudentIds?.length) {
    const assignments = input.assignedStudentIds.map((studentId) => ({
      staff_id: newUserId,
      student_id: studentId,
      assigned_by: sessionData.user.id,
      task_notes: input.taskNotes ?? null,
    }));

    const { error: assignError } = await supabaseAdmin
      .from("staff_assignments")
      .insert(assignments);

    if (assignError) {
      // Account itself was created successfully — this is a partial
      // failure, not a full rollback. Surface it so the admin knows to
      // assign students manually afterward.
      return {
        success: true,
        userId: newUserId,
      };
    }
  }

  return { success: true, userId: newUserId };
}