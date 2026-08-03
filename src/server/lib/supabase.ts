import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { backendConfig, getMissingBackendSecrets } from "./backend-config";

type SupabaseAdminOptions = {
  url: string;
  serviceRoleKey: string;
};

function createSupabaseAdminClient({ url, serviceRoleKey }: SupabaseAdminOptions): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createPrimarySupabaseClient(): SupabaseClient {
  const missing = getMissingBackendSecrets();

  if (missing.includes("SUPABASE_URL") || missing.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    throw new Error("Primary Supabase environment variables are not configured.");
  }

  return createSupabaseAdminClient({
    url: backendConfig.supabasePrimaryUrl,
    serviceRoleKey: backendConfig.supabasePrimaryServiceRoleKey,
  });
}

export function createBackupSupabaseClient(): SupabaseClient {
  const missing = getMissingBackendSecrets();

  if (missing.includes("SUPABASE_BACKUP_URL") || missing.includes("SUPABASE_BACKUP_SERVICE_ROLE_KEY")) {
    throw new Error("Backup Supabase environment variables are not configured.");
  }

  return createSupabaseAdminClient({
    url: backendConfig.supabaseBackupUrl,
    serviceRoleKey: backendConfig.supabaseBackupServiceRoleKey,
  });
}
