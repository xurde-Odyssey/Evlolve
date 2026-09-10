"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Edit3, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServerCommandResponse, NotepadNoteInput, NotepadNoteUpdateInput } from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";
import type { NotepadColor, NotepadNote } from "@/types/notepad";
import { cn } from "@/lib/utils/cn";

type NotepadWorkspaceProps = {
  notes: NotepadNote[];
  createNoteAction?: (input: NotepadNoteInput) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
  updateNoteAction?: (id: string, input: NotepadNoteUpdateInput) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
  deleteNoteAction?: (id: string) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
};

const noteColors: { value: NotepadColor; label: string }[] = [
  { value: "paper", label: "Paper" },
  { value: "rose", label: "Rose" },
  { value: "yellow", label: "Yellow" },
  { value: "blue", label: "Blue" },
];

export function NotepadWorkspace({ notes, createNoteAction, updateNoteAction, deleteNoteAction }: NotepadWorkspaceProps) {
  const router = useRouter();
  const [visibleNotes, setVisibleNotes] = useState(notes);
  const [adding, setAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function addNote() {
    if (!createNoteAction || adding) return;
    setAdding(true);
    setMessage(null);
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)]?.value ?? "paper";
    const result = await createNoteAction({
      title: "New note",
      body: "Write directly on this note...",
      color: randomColor,
    });
    if (result.ok) {
      setMessage("Note added.");
      if (result.data.notepadNote) {
        const note = result.data.notepadNote as NotepadNote;
        setVisibleNotes((current) => [note, ...current]);
        setEditingNoteId(note.id);
      }
      router.refresh();
    } else setMessage(result.message);
    setAdding(false);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="notepad-board min-h-[30rem] rounded-lg border border-[var(--border)] p-4 sm:p-7" aria-label="Notepad wall">
        <div className="mb-6 flex justify-end">
          <div className="flex items-center gap-2">
            <Button className="notepad-add-button" type="button" onClick={addNote} disabled={adding || !createNoteAction} aria-label="Add note" title="Add note">{adding ? <LoaderCircle className="size-5 animate-spin" /> : <Plus className="size-6" />}</Button>
          </div>
        </div>

        {visibleNotes.length > 0 ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleNotes.map((note, index) => <NoteCard key={note.id} note={note} index={index} initialEditing={note.id === editingNoteId} onEditingChange={(editing) => editing ? setEditingNoteId(note.id) : setEditingNoteId(null)} onNoteSaved={(savedNote) => setVisibleNotes((current) => current.map((item) => item.id === savedNote.id ? savedNote : item))} onNoteDeleted={(deletedId) => setVisibleNotes((current) => current.filter((item) => item.id !== deletedId))} updateNoteAction={updateNoteAction} deleteNoteAction={deleteNoteAction} />)}</div> : <WelcomeNote onAdd={addNote} adding={adding} disabled={!createNoteAction} />}
      </section>
      {message ? <p className="text-sm font-semibold text-[var(--foreground-muted)]" role="status">{message}</p> : null}
    </div>
  );
}

function WelcomeNote({ onAdd, adding, disabled }: { onAdd: () => void; adding: boolean; disabled: boolean }) {
  return <article className="notepad-note notepad-note-yellow notepad-empty-note max-w-sm p-6" style={{ transform: "rotate(-1deg)" }}><button type="button" className="notepad-empty-add" onClick={onAdd} disabled={adding || disabled} aria-label="Add your first note">{adding ? <LoaderCircle className="size-6 animate-spin" /> : <Plus className="size-8" />}</button><p className="notepad-note-body mt-4 text-center text-[var(--foreground-muted)]">Start a note</p></article>;
}

function NoteCard({ note, index, initialEditing, onEditingChange, onNoteSaved, onNoteDeleted, updateNoteAction, deleteNoteAction }: { note: NotepadNote; index: number; initialEditing?: boolean; onEditingChange: (editing: boolean) => void; onNoteSaved: (note: NotepadNote) => void; onNoteDeleted: (id: string) => void; updateNoteAction?: NotepadWorkspaceProps["updateNoteAction"]; deleteNoteAction?: NotepadWorkspaceProps["deleteNoteAction"] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(Boolean(initialEditing));
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!updateNoteAction || saving) return;
    setSaving(true);
    const result = await updateNoteAction(note.id, { title, body });
    setMessage(result.ok ? null : result.message);
    if (result.ok) {
      if (result.data.notepadNote) onNoteSaved(result.data.notepadNote);
      setEditing(false);
      onEditingChange(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function remove() {
    if (!deleteNoteAction || saving) return;
    setSaving(true);
    setRemoving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    const result = await deleteNoteAction(note.id);
    setMessage(result.ok ? null : result.message);
    if (result.ok) {
      onNoteDeleted(note.id);
      router.refresh();
    }
    else setRemoving(false);
    setSaving(false);
  }

  return <article className={cn("notepad-note relative p-5", `notepad-note-${note.color}`, removing && "notepad-note-tearing")} style={{ transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)` }}>
    {editing ? <div className="space-y-3"><input autoFocus className="notepad-note-title w-full bg-transparent pb-1 outline-none" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled note" /><textarea className="notepad-note-body min-h-28 w-full resize-y bg-transparent outline-none" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write directly on this note..." /><div className="flex justify-end gap-2"><Button variant="ghost" className="action-pill-outline gap-2" type="button" onClick={() => { setEditing(false); onEditingChange(false); }}><X className="size-4" />Cancel</Button><Button className="action-pill gap-2" type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save</Button></div></div> : <><div className="flex items-start justify-between gap-3"><h2 className="notepad-note-title text-[var(--foreground)]">{note.title}</h2><div className="flex items-center gap-1"><button className="notepad-icon-button" type="button" aria-label={`Edit ${note.title}`} onClick={() => { setEditing(true); onEditingChange(true); }}><Edit3 className="size-4" /></button><button className="notepad-icon-button" type="button" aria-label={`Remove ${note.title}`} onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /></button></div></div><p className="notepad-note-body mt-4 whitespace-pre-wrap text-[var(--foreground)]">{note.body || "Write directly on this note..."}</p>{confirmDelete ? <div className="notepad-delete-confirm mt-5"><AlertTriangle className="size-4 shrink-0" aria-hidden="true" /><span>Remove this note?</span><div className="ml-auto flex items-center gap-1"><button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button><button type="button" onClick={remove} disabled={saving}>{saving ? <LoaderCircle className="size-3 animate-spin" /> : "Remove"}</button></div></div> : null}</>}
    {message ? <p className="mt-3 text-xs font-semibold text-[var(--destructive)]" role="alert">{message}</p> : null}
  </article>;
}
