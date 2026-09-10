"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AchievementHubViewModel, HubAchievementPresentation } from "@/application/evolve/achievement-hub";
import type { Achievement } from "@/types/achievement";
import type { Book } from "@/types/book";

type Props = { viewModel: AchievementHubViewModel };
type WallSlot = { id: string; x: number; y: number; width: number; height: number; rotation: number };
type DeskSlot = { x: number; y: number; scale: number };
type ShelfSlot = { x: number; y: number; width: number; height: number; tilt: number };
type SelectedObject =
  | { type: "achievement"; achievement: Achievement; x: number; y: number }
  | { type: "book"; book: Book; x: number; y: number }
  | undefined;

const wallSlots: WallSlot[] = [
  { id: "wall-large-1", x: 145, y: 92, width: 150, height: 178, rotation: -1 },
  { id: "wall-medium-1", x: 340, y: 112, width: 126, height: 142, rotation: 1 },
  { id: "wall-small-1", x: 505, y: 88, width: 108, height: 120, rotation: -2 },
  { id: "wall-medium-2", x: 185, y: 302, width: 122, height: 132, rotation: 1 },
  { id: "wall-small-2", x: 348, y: 286, width: 105, height: 114, rotation: -1 },
  { id: "wall-medium-3", x: 495, y: 270, width: 132, height: 148, rotation: 2 },
  { id: "wall-small-3", x: 650, y: 96, width: 100, height: 112, rotation: 1 },
  { id: "wall-small-4", x: 660, y: 276, width: 102, height: 116, rotation: -1 },
];
const deskSlots: DeskSlot[] = [{ x: 420, y: 440, scale: 0.9 }, { x: 535, y: 438, scale: 0.74 }, { x: 640, y: 438, scale: 0.82 }];
const shelfRows = [{ y: 248, height: 84 }, { y: 350, height: 84 }, { y: 452, height: 84 }];

export function AchievementHubWorkspace({ viewModel }: Props) {
  const [selected, setSelected] = useState<SelectedObject>();
  const frameMap = new Map(viewModel.frames.map((frame) => [frame.slot, frame]));
  const artifactMap = new Map(viewModel.deskArtifacts.map((artifact) => [artifact.slot, artifact]));
  const visibleBooks = viewModel.completedBooks.slice(0, 30);

  return (
    <div className="achievement-room-scene-wrap">
      <div className="achievement-room-scene" aria-label="Achievement room, a visual history of earned accomplishments and completed books">
        <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="achievement-room-title achievement-room-description">
          <title id="achievement-room-title">Achievement Hub room</title>
          <desc id="achievement-room-description">A sketched room with achievement frames on the wall, a desk for significant accomplishments, and a bookshelf for completed books.</desc>
          <defs>
            <linearGradient id="hub-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hub-wall)" /><stop offset="1" stopColor="var(--hub-wall-deep)" /></linearGradient>
            <linearGradient id="hub-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hub-floor)" /><stop offset="1" stopColor="var(--hub-floor-deep)" /></linearGradient>
            <filter id="hub-shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="7" /></filter>
          </defs>
          <RoomShell />
          <AchievementWall frames={wallSlots.map((slot, index) => ({ slot, frame: frameMap.get(index) }))} onSelect={(frame, slot) => setSelected({ type: "achievement", achievement: frame.achievement, x: slot.x + slot.width / 2, y: slot.y + slot.height + 18 })} />
          <Bookshelf books={visibleBooks} hasMoreBooks={viewModel.completedBooks.length > visibleBooks.length} onSelect={(book, x, y) => setSelected({ type: "book", book, x, y })} />
          <Desk />
          <DeskArtifacts artifacts={deskSlots.map((slot, index) => ({ slot, artifact: artifactMap.get(index) }))} onSelect={(artifact, slot) => setSelected({ type: "achievement", achievement: artifact.achievement, x: slot.x, y: slot.y - 80 })} />
          <AmbientDetails />
        </svg>
        {selected ? <RoomObjectDetails selected={selected} onClose={() => setSelected(undefined)} /> : null}
      </div>
      <div className="achievement-room-accessible-list"><p className="sr-only">Earned accomplishments and completed books in this room.</p>{viewModel.frames.map((frame) => <span key={frame.achievement.id}>{frame.achievement.title}</span>)}{viewModel.completedBooks.map((book) => <span key={book.id}>{book.title}</span>)}</div>
      <div className="flex items-center justify-between gap-4 pt-2"><p className="text-sm text-[var(--foreground-muted)]">The room changes as evidence accumulates.</p><Link href="/achievements" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 transition hover:text-[var(--accent-pro)]">View all achievements <ArrowUpRight aria-hidden="true" className="size-4" /></Link></div>
    </div>
  );
}

function RoomShell() {
  return <g id="room-shell"><rect width="1200" height="510" fill="url(#hub-wall)" /><polygon points="0,510 1200,510 1200,700 0,700" fill="url(#hub-floor)" /><path d="M0 510H1200" className="hub-line hub-line-heavy" /><path d="M0 620H1200 M0 670H1200" className="hub-line hub-line-faint" /><path d="M70 510L220 700 M1130 510L990 700" className="hub-line hub-line-faint" /><path d="M55 510V54H1145V510 M76 510V74H1124V510" className="hub-line hub-line-faint" /><path d="M85 74H1115" className="hub-line" /></g>;
}

function AchievementWall({ frames, onSelect }: { frames: { slot: WallSlot; frame?: HubAchievementPresentation }[]; onSelect: (frame: HubAchievementPresentation, slot: WallSlot) => void }) {
  return <g id="wall-frames">{frames.map(({ slot, frame }) => <g key={slot.id} transform={`rotate(${slot.rotation} ${slot.x + slot.width / 2} ${slot.y + slot.height / 2})`}><rect x={slot.x + 5} y={slot.y + 7} width={slot.width} height={slot.height} className="hub-frame-shadow" /><rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} className="hub-frame" /><rect x={slot.x + 12} y={slot.y + 12} width={slot.width - 24} height={slot.height - 24} className="hub-frame-inner" />{frame ? <g className="hub-interactive" role="button" tabIndex={0} aria-label={`${frame.achievement.title}, earned ${frame.achievement.earnedAt}`} onClick={() => onSelect(frame, slot)} onKeyDown={(event) => handleEnter(event, () => onSelect(frame, slot))}><AchievementSymbol category={frame.achievement.category} x={slot.x + slot.width / 2} y={slot.y + slot.height / 2} size={Math.min(slot.width, slot.height) * 0.36} /></g> : null}</g>)}</g>;
}

function AchievementSymbol({ category, x, y, size }: { category: Achievement["category"]; x: number; y: number; size: number }) {
  if (category === "boss") return <path d={`M${x - size * 0.42} ${y + size * 0.48}L${x - size * 0.28} ${y - size * 0.46}L${x} ${y - size * 0.7}L${x + size * 0.32} ${y - size * 0.42}L${x + size * 0.42} ${y + size * 0.48}Z`} className="hub-symbol" />;
  if (category === "lifetime") return <path d={`M${x} ${y - size * 0.7}L${x + size * 0.55} ${y - size * 0.28}L${x + size * 0.38} ${y + size * 0.48}L${x} ${y + size * 0.7}L${x - size * 0.38} ${y + size * 0.48}L${x - size * 0.55} ${y - size * 0.28}Z`} className="hub-symbol" />;
  if (category === "discipline") return <g className="hub-symbol"><path d={`M${x - size * 0.46} ${y + size * 0.55}V${y - size * 0.5} M${x} ${y + size * 0.55}V${y - size * 0.7} M${x + size * 0.46} ${y + size * 0.55}V${y - size * 0.35}`} /><path d={`M${x - size * 0.6} ${y + size * 0.55}H${x + size * 0.6}`} /></g>;
  if (category === "milestone") return <path d={`M${x - size * 0.58} ${y + size * 0.55}H${x - size * 0.2}V${y + size * 0.18}H${x + size * 0.18}V${y - size * 0.2}H${x + size * 0.58}V${y - size * 0.58}`} className="hub-symbol" />;
  return <path d={`M${x - size * 0.6} ${y + size * 0.45}L${x - size * 0.2} ${y - size * 0.25}L${x + size * 0.1} ${y + size * 0.05}L${x + size * 0.6} ${y - size * 0.55}`} className="hub-symbol" />;
}

function Desk() {
  return <g id="desk"><ellipse cx="520" cy="634" rx="300" ry="22" className="hub-ground-shadow" /><polygon points="275,420 760,420 825,450 335,450" className="hub-desk-top" /><polygon points="335,450 825,450 817,465 328,465" className="hub-desk-front" /><polygon points="275,420 335,450 328,465 267,435" className="hub-desk-side" /><path d="M335 450H825 M328 465H817" className="hub-line" /><path d="M315 465L292 620 M805 465L828 620" className="hub-line-heavy" /><path d="M292 620H275 M828 620H845" className="hub-line" /><path d="M450 466H610V494H450Z" className="hub-desk-drawer" /><path d="M520 478H545" className="hub-line" /><path d="M365 466V605 M752 466V605" className="hub-line-faint" /></g>;
}

function DeskArtifacts({ artifacts, onSelect }: { artifacts: { slot: DeskSlot; artifact?: HubAchievementPresentation }[]; onSelect: (artifact: HubAchievementPresentation, slot: DeskSlot) => void }) {
  return <g id="desk-artifacts">{artifacts.map(({ slot, artifact }) => artifact ? <g key={artifact.achievement.id} className="hub-interactive" role="button" tabIndex={0} aria-label={`${artifact.achievement.title}, desk artifact`} onClick={() => onSelect(artifact, slot)} onKeyDown={(event) => handleEnter(event, () => onSelect(artifact, slot))} transform={`translate(${slot.x} ${slot.y}) scale(${slot.scale})`}>{artifact.visualVariant === "boss-monolith" ? <path d="M-27 0L-18 -62L0 -88L24 -58L30 0Z" className="hub-artifact hub-artifact-boss" /> : artifact.visualVariant === "lifetime-core" ? <path d="M0 -92L38 -44L25 6L0 25L-25 6L-38 -44Z" className="hub-artifact hub-artifact-core" /> : <path d="M-28 0L-15 -72L0 -46L16 -82L30 0Z" className="hub-artifact hub-artifact-mastery" />}<path d="M-33 0H33" className="hub-line" /></g> : null)}</g>;
}

function Bookshelf({ books, hasMoreBooks, onSelect }: { books: Book[]; hasMoreBooks: boolean; onSelect: (book: Book, x: number, y: number) => void }) {
  return <g id="bookshelf"><ellipse cx="1018" cy="590" rx="130" ry="16" className="hub-ground-shadow" /><path d="M900 178L1135 190V565L900 552Z" className="hub-shelf-back" /><polygon points="875,165 1132,165 1152,185 898,185" className="hub-shelf-top" /><polygon points="875,165 898,185 898,552 875,535" className="hub-shelf-side" /><polygon points="1132,165 1152,185 1152,570 1135,565" className="hub-shelf-side" /><path d="M875 165L1132 165L1152 185L1152 570L1135 565L900 552L875 535Z" className="hub-line-heavy" />{shelfRows.map((row, rowIndex) => <g key={row.y}><polygon points={`895,${row.y + row.height} 1138,${row.y + row.height + 12} 1150,${row.y + row.height + 5} 900,${row.y + row.height - 5}`} className="hub-shelf" /><path d={`M900 ${row.y + row.height - 5}L1138 ${row.y + row.height + 7}`} className="hub-line" />{books.slice(rowIndex * 10, rowIndex * 10 + 10).map((book, index) => <BookSpine key={book.id} book={book} slot={bookSlot(book, index, row.y + row.height - 6)} onSelect={onSelect} />)}</g>)}{hasMoreBooks ? <path d="M1110 550L1122 558L1110 566" className="hub-symbol" aria-label="More completed books" /> : null}</g>;
}

function bookSlot(book: Book, index: number, baseline: number): ShelfSlot {
  const variation = stableHash(book.id || book.title);
  return { x: 900 + index * 22, y: baseline - (52 + variation % 17), width: 16 + variation % 7, height: 52 + variation % 17, tilt: (variation % 5) - 2 };
}

function BookSpine({ book, slot, onSelect }: { book: Book; slot: ShelfSlot; onSelect: (book: Book, x: number, y: number) => void }) {
  return <g className="hub-interactive" role="button" tabIndex={0} aria-label={`Completed book: ${book.title}`} onClick={() => onSelect(book, slot.x + slot.width / 2, slot.y - 8)} onKeyDown={(event) => handleEnter(event, () => onSelect(book, slot.x + slot.width / 2, slot.y - 8))} transform={`rotate(${slot.tilt} ${slot.x} ${slot.y + slot.height})`}><rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} rx="1" className={`hub-book hub-book-${stableHash(book.id) % 4}`} /><path d={`M${slot.x + 4} ${slot.y + 9}V${slot.y + slot.height - 9}`} className="hub-book-line" /></g>;
}

function AmbientDetails() {
  return <g id="ambient-details" aria-hidden="true"><path d="M80 516H190 M1010 516H1140" className="hub-line-faint" /><path d="M112 533H175 M1030 533H1110" className="hub-line-faint" /></g>;
}

function RoomObjectDetails({ selected, onClose }: { selected: Exclude<SelectedObject, undefined>; onClose: () => void }) {
  const title = selected.type === "achievement" ? selected.achievement.title : selected.book.title;
  const subtitle = selected.type === "achievement" ? `${selected.achievement.category}${selected.achievement.tierLabel ? ` · ${selected.achievement.tierLabel}` : ""}` : selected.book.metadata?.authorName ?? "Completed book";
  const date = selected.type === "achievement" ? selected.achievement.earnedAt : selected.book.finishedAt;
  return <div className="achievement-room-tooltip" style={{ left: `${(selected.x / 1200) * 100}%`, top: `${(selected.y / 700) * 100}%` }} role="dialog" aria-label={title}><button type="button" onClick={onClose} aria-label="Close detail">Close</button><strong>{title}</strong><span>{subtitle}</span><small>{selected.type === "book" && selected.book.totalPages ? `${selected.book.totalPages} pages · ` : ""}{date ? `Finished ${date}` : "Earned"}</small></div>;
}

function handleEnter(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); }
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}
