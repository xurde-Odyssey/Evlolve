import "server-only";

import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { CommunicationRepository } from "../repository";

export async function getCommunicationContext() {
  if (!isSupabaseAuthorityConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, repository: new CommunicationRepository(createSupabaseServiceClient()) };
}
