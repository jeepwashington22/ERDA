// One-off admin recovery: generate a password-recovery link for an account.
//
// Usage:  npx tsx scripts/recover-account.ts user@example.com
//
// WHY THIS EXISTS: Supabase's built-in dev SMTP is rate-limited and often
// drops/spam-filters mail, so the in-app "reset by email" flow may not
// deliver. admin.generateLink still returns the recovery link itself; this
// script writes it to account-recovery-link.txt (never to stdout) so the
// account owner can click it locally and set a new password.
//
// SECURITY: the file contains a live one-time credential. Delete it after
// use. The link is also git-ignored.
//
// NOTE: dotenv v17 loads ".env" by default; this project keeps secrets in
// ".env.local", so load both explicitly (.env.local wins because dotenv
// never overrides variables that are already set).
//
// IMPORTANT: static `import` statements are HOISTED above these config()
// calls during TS->CJS emit, which would make backend-config snapshot an
// empty process.env. The Supabase module is therefore imported dynamically
// inside main(), AFTER the env vars are injected.

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { writeFileSync } from "node:fs";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: npx tsx scripts/recover-account.ts <email>");
    process.exit(1);
  }

  const { createPrimarySupabaseClient } = await import("../src/server/lib/supabase");
  const admin = createPrimarySupabaseClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${siteUrl}/reset-password`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error(`generateLink failed for ${email}:`, error.message);
    process.exit(1);
  }

  const properties = data?.properties;
  const actionLink = properties?.action_link;
  const userId = data?.user?.id ?? "(unknown id)";

  if (!actionLink) {
    console.error("Supabase returned no action_link (unexpected response).");
    process.exit(1);
  }

  const contents = [
    "ERDA Scholar System — one-time password recovery link",
    `Generated: ${new Date().toISOString()}`,
    `Account:   ${email} (id ${userId})`,
    "",
    "Open the link below, then choose a new password (min 8 characters).",
    "The link is single-use. DELETE THIS FILE after using it.",
    "",
    actionLink,
    "",
  ].join("\n");

  writeFileSync("account-recovery-link.txt", contents, "utf8");

  console.log(`OK: user ${email} (${userId})`);
  console.log("Recovery link written to account-recovery-link.txt");
  console.log("Open that file and click the link to set a new password.");
  console.log("Delete the file afterwards — it contains a live one-time link.");
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});