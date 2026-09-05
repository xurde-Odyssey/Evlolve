import "server-only";

import { createDemoEvolveState, getDashboardViewModel, type EvolveLocalState } from "@/application/evolve";
import { SupabaseEvolveStateRepository } from "@/infrastructure/supabase/evolve-state-repository";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";

export async function getCurrentUser() {
  if (!isSupabaseAuthorityConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentEvolveState(): Promise<EvolveLocalState> {
  const user = await getCurrentUser();

  if (!user) {
    return createDemoEvolveState();
  }

  const repository = new SupabaseEvolveStateRepository(createSupabaseServiceClient());
  await repository.ensureProfile(
    user.id,
    stringMetadata(user.user_metadata.timezone) ?? "UTC",
  );

  return repository.loadState(user.id);
}

export async function getDashboardQuery() {
  return getDashboardViewModel(await getCurrentEvolveState());
}

function stringMetadata(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
