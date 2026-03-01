import { createClient } from "@supabase/supabase-js";

// These will be loaded from environment variables
// In Tauri, you can set these in .env or via tauri config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const missingSupabaseEnv = !supabaseUrl || !supabaseAnonKey;

const missingSupabaseEnvError = new Error(
  "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pharmacy-desktop/.env"
);

export const supabase = missingSupabaseEnv
  ? (new Proxy(
      {},
      {
        get() {
          throw missingSupabaseEnvError;
        },
      }
    ) as any)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

if (!missingSupabaseEnv) {
  console.info(`[supabase] using url: ${supabaseUrl}`);
}

export function isMissingColumnError(err: unknown, column: string): boolean {
  const e = err as any;
  const msg = (e?.message ?? e?.error_description ?? "") as string;
  return typeof msg === "string" && msg.toLowerCase().includes(column.toLowerCase());
}

export type SupabaseClient = typeof supabase;
