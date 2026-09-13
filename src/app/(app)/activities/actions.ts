"use server";

import { revalidatePath } from "next/cache";
import {
  logActivityAuthoritatively,
  logBehaviorOccurrenceAuthoritatively,
  type ServerActivityLogInput,
  type ServerActivityLogResponse,
  type BehaviorOccurrenceInput,
  type ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

export async function logActivityAction(
  input: ServerActivityLogInput,
): Promise<EvolveServerActionResult<ServerActivityLogResponse>> {
  const result = await logActivityAuthoritatively(input);

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/activities");
    revalidatePath("/reports");
  }

  return result;
}

export async function logBehaviorOccurrenceFromActivitiesAction(
  input: BehaviorOccurrenceInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await logBehaviorOccurrenceAuthoritatively(input);
  if (result.ok) {
    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    revalidatePath("/reports");
  }
  return result;
}
