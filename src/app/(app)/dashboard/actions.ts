"use server";

import { revalidatePath } from "next/cache";
import {
  completeWeeklyReminderAuthoritatively,
  type ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

export async function completeWeeklyReminderAction(
  reminderId: string,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await completeWeeklyReminderAuthoritatively(reminderId);
  if (result.ok) revalidatePath("/dashboard");
  return result;
}
