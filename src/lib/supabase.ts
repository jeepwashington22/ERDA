import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserSupabaseClient: SupabaseClient | null = null;

function getRequiredPublicEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing public Supabase environment variable: ${name}`);
  }

  return value;
}

export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(
      getRequiredPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    );
  }

  return browserSupabaseClient;
}
