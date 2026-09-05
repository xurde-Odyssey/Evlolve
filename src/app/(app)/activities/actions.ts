"use server";

import { revalidatePath } from "next/cache";
import {
  logActivityAuthoritatively,
  type ServerActivityLogInput,
  type ServerActivityLogResponse,
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
