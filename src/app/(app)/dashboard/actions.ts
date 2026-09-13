"use server";

import { revalidatePath } from "next/cache";
import {
  completeWeeklyReminderAuthoritatively,
  logBehaviorOccurrenceAuthoritatively,
  type BehaviorOccurrenceInput,
  type ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

export async function logBehaviorOccurrenceAction(
  input: BehaviorOccurrenceInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await logBehaviorOccurrenceAuthoritatively(input);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/settings");
  }
  return result;
}

export async function completeWeeklyReminderAction(
  reminderId: string,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await completeWeeklyReminderAuthoritatively(reminderId);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/quests");
  }
  return result;
}
