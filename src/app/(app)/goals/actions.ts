"use server";

import { revalidatePath } from "next/cache";
import {
  acceptBossAuthoritatively,
  rejectBossAuthoritatively,
  type ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

export async function acceptBossAction(
  bossId: string,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await acceptBossAuthoritatively(bossId);
  if (result.ok) revalidatePath("/goals");
  return result;
}

export async function rejectBossAction(
  bossId: string,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await rejectBossAuthoritatively(bossId);
  if (result.ok) revalidatePath("/goals");
  return result;
}
