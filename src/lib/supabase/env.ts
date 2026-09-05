export type SupabaseRuntimeEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  useSupabase: boolean;
};

export function getSupabaseRuntimeEnv(): SupabaseRuntimeEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const useSupabase = process.env.EVOLVE_USE_SUPABASE === "true";

  return {
    url,
    anonKey,
    serviceRoleKey,
    useSupabase,
  };
}

export function isSupabaseConfigured() {
  const env = getSupabaseRuntimeEnv();

  return Boolean(env.url && env.anonKey);
}

export function isSupabaseAuthorityConfigured() {
  const env = getSupabaseRuntimeEnv();

  return Boolean(env.url && env.anonKey && env.serviceRoleKey && env.useSupabase);
}

export function requireSupabaseEnv() {
  const env = getSupabaseRuntimeEnv();

  if (!env.url || !env.anonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return env;
}

export function requireSupabaseAuthorityEnv() {
  const env = requireSupabaseEnv();

  if (!env.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for authoritative Evolve commands.");
  }

  return {
    ...env,
    serviceRoleKey: env.serviceRoleKey,
  };
}
