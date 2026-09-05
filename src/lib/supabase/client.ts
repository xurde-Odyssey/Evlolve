"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const env = requireSupabaseEnv();

  return createBrowserClient(env.url, env.anonKey);
}
