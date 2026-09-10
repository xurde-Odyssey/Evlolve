"use server";

import { revalidatePath } from "next/cache";
import {
  selectTitleAuthoritatively,
  createMajorMilestoneAuthoritatively,
  updateProfileAuthoritatively,
  type ProfileUpdateInput,
  type MajorMilestoneInput,
  type ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

export async function updateProfileAction(input: ProfileUpdateInput): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await updateProfileAuthoritatively(input);
  if (result.ok) {
    revalidatePath("/character");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function selectTitleAction(titleId: string): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await selectTitleAuthoritatively(titleId);
  if (result.ok) {
    revalidatePath("/character");
    revalidatePath("/achievements");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function createMajorMilestoneAction(
  input: MajorMilestoneInput,
): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await createMajorMilestoneAuthoritatively(input);
  if (result.ok) {
    revalidatePath("/character");
    revalidatePath("/dashboard");
  }
  return result;
}
