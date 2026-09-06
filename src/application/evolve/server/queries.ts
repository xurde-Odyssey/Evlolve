import "server-only";

import { createEmptyEvolveState, getDashboardViewModel, type EvolveLocalState } from "@/application/evolve";
import { defaultUserTimePolicy } from "@/application/evolve/time-policy";
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
    return createEmptyEvolveState({ userId: "unauthenticated" });
  }

  const repository = new SupabaseEvolveStateRepository(createSupabaseServiceClient());
  const configuredTimezone = stringMetadata(user.user_metadata.timezone);
  const timezone = configuredTimezone === "UTC" || !configuredTimezone
    ? defaultUserTimePolicy.timezone
    : configuredTimezone;
  await repository.ensureProfile(
    user.id,
    timezone,
  );

  return repository.loadState(user.id);
}

export async function getDashboardQuery() {
  return getDashboardViewModel(await getCurrentEvolveState());
}

function stringMetadata(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
