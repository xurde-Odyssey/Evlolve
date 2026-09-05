"use server";

import { revalidatePath } from "next/cache";
import {
  activateConfiguredActivityAuthoritatively,
  activateBookaholicAuthoritatively,
  type BookaholicActivationInput,
  deactivateConfiguredActivityAuthoritatively,
  type ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";
import type { ActivityConfiguration } from "@/types/settings";

export async function activateActivityAction(
  configuration: ActivityConfiguration,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await activateConfiguredActivityAuthoritatively(configuration);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/activities");
  }
  return result;
}

export async function activateBookaholicAction(
  input: BookaholicActivationInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await activateBookaholicAuthoritatively(input);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/activities");
  }
  return result;
}

export async function deactivateActivityAction(
  activityKey: ActivityConfiguration["activityKey"],
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await deactivateConfiguredActivityAuthoritatively(activityKey);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/activities");
  }
  return result;
}
