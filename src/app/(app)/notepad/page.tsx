import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { NotepadWorkspace } from "@/components/notepad/notepad-workspace";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { isSupabaseAuthorityConfigured } from "@/lib/supabase/env";
import { createNotepadNoteAction, deleteNotepadNoteAction, updateNotepadNoteAction } from "./actions";

export default async function NotepadPage() {
  const state = await getCurrentEvolveState();
  const connected = isSupabaseAuthorityConfigured();

  return <PageContainer className="notepad-page-surface"><PageHeader eyebrow="/notepad" title="Notepad" description="Quick thoughts, observations, and next actions." /><NotepadWorkspace notes={state.notepadNotes} createNoteAction={connected ? createNotepadNoteAction : undefined} updateNoteAction={connected ? updateNotepadNoteAction : undefined} deleteNoteAction={connected ? deleteNotepadNoteAction : undefined} /></PageContainer>;
}
