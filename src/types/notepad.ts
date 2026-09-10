export type NotepadColor = "paper" | "rose" | "yellow" | "blue";

export type NotepadNote = {
  id: string;
  title: string;
  body: string;
  color: NotepadColor;
  createdAt: string;
  updatedAt: string;
};
