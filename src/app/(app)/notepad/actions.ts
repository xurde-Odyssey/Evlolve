"use server";

import { revalidatePath } from "next/cache";
import {
  createNotepadNoteAuthoritatively,
  deleteNotepadNoteAuthoritatively,
  updateNotepadNoteAuthoritatively,
  type NotepadNoteInput,
  type NotepadNoteUpdateInput,
  type ServerCommandResponse,
} from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

export async function createNotepadNoteAction(input: NotepadNoteInput): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await createNotepadNoteAuthoritatively(input);
  if (result.ok) revalidatePath("/notepad");
  return result;
}

export async function updateNotepadNoteAction(id: string, input: NotepadNoteUpdateInput): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await updateNotepadNoteAuthoritatively(id, input);
  if (result.ok) revalidatePath("/notepad");
  return result;
}

export async function deleteNotepadNoteAction(id: string): Promise<EvolveServerActionResult<ServerCommandResponse>> {
  const result = await deleteNotepadNoteAuthoritatively(id);
  if (result.ok) revalidatePath("/notepad");
  return result;
}
