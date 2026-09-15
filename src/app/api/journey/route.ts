import { NextResponse } from "next/server";
import { createJourneySeed } from "@/application/journey/seed";
import { getCurrentUser } from "@/application/evolve/server/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { JourneyWorkspaceData } from "@/types/journey-workspace";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before viewing your Journey." }, { status: 401 });

  try {
    const supabase = createSupabaseServiceClient();
    let { data: journey, error } = await supabase.from("journeys").select("*").eq("user_id", user.id).eq("is_primary", true).maybeSingle();
    if (error) throw error;

    if (!journey) {
      const profile = await supabase.from("profiles").select("goals").eq("id", user.id).maybeSingle();
      const goal = Array.isArray(profile.data?.goals) && typeof profile.data.goals[0] === "string" ? profile.data.goals[0] : undefined;
      const seed = createJourneySeed(goal);
      const created = await supabase.from("journeys").insert({ user_id: user.id, title: seed.focus.title, description: seed.focus.description, started_at: seed.focus.startedAt, status: seed.focus.status, is_primary: true }).select("*").single();
      if (created.error) throw created.error;
      journey = created.data;
      await insertSeedChildren(supabase, journey.id, seed);
    }

    return NextResponse.json(await loadWorkspace(supabase, journey));
  } catch {
    return NextResponse.json({ error: "Journey could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before saving your Journey." }, { status: 401 });

  try {
    const workspace = (await request.json()) as JourneyWorkspaceData;
    if (!workspace?.focus?.id || !workspace.focus.title) return NextResponse.json({ error: "Journey focus is required." }, { status: 400 });
    const supabase = createSupabaseServiceClient();
    const ownedJourney = await supabase.from("journeys").select("id").eq("id", workspace.focus.id).eq("user_id", user.id).maybeSingle();
    if (ownedJourney.error) throw ownedJourney.error;
    if (!ownedJourney.data) return NextResponse.json({ error: "Journey not found." }, { status: 404 });

    const updated = await supabase.from("journeys").update({ title: workspace.focus.title, description: workspace.focus.description, started_at: workspace.focus.startedAt, target_date: workspace.focus.targetDate ?? null, status: workspace.focus.status, updated_at: new Date().toISOString() }).eq("id", workspace.focus.id).eq("user_id", user.id);
    if (updated.error) throw updated.error;
    await Promise.all([
      supabase.from("journey_diary_relations").delete().in("diary_entry_id", (workspace.diary ?? []).map((entry) => entry.id)),
      supabase.from("journey_nodes").delete().eq("journey_id", workspace.focus.id),
      supabase.from("journey_diary_entries").delete().eq("journey_id", workspace.focus.id),
      supabase.from("journey_quick_notes").delete().eq("journey_id", workspace.focus.id),
      supabase.from("journey_next_steps").delete().eq("journey_id", workspace.focus.id),
    ]);
    await insertChildren(supabase, workspace.focus.id, workspace);
    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: "Journey could not be saved." }, { status: 500 });
  }
}

async function loadWorkspace(supabase: ReturnType<typeof createSupabaseServiceClient>, journey: Record<string, unknown>): Promise<JourneyWorkspaceData> {
  const [nodes, diary, notes, steps] = await Promise.all([
    supabase.from("journey_nodes").select("*").eq("journey_id", journey.id).order("sort_order"),
    supabase.from("journey_diary_entries").select("*").eq("journey_id", journey.id).order("entry_date", { ascending: false }),
    supabase.from("journey_quick_notes").select("*").eq("journey_id", journey.id).order("created_at", { ascending: false }),
    supabase.from("journey_next_steps").select("*").eq("journey_id", journey.id).order("created_at"),
  ]);
  if (nodes.error || diary.error || notes.error || steps.error) throw nodes.error ?? diary.error ?? notes.error ?? steps.error;
  return {
    focus: { id: String(journey.id), title: String(journey.title), description: String(journey.description ?? ""), startedAt: String(journey.started_at), targetDate: journey.target_date ? String(journey.target_date) : undefined, status: journey.status as JourneyWorkspaceData["focus"]["status"] },
    nodes: (nodes.data ?? []).map((node) => ({ id: String(node.id), category: node.category, title: node.title, description: node.description ?? undefined, status: node.status, completed: Boolean(node.completed), completedAt: node.completed_at ?? (node.completed ? kathmanduDate() : undefined), level: node.level ?? undefined })),
    diary: (diary.data ?? []).map((entry) => ({ id: String(entry.id), title: entry.title, body: entry.body, type: entry.type, entryDate: entry.entry_date, tags: entry.tags ?? [], nodeIds: [], milestone: Boolean(entry.milestone) })),
    notes: (notes.data ?? []).map((note) => ({ id: String(note.id), body: note.body, createdAt: note.created_at.slice(0, 10), pinned: Boolean(note.pinned) })),
    nextSteps: (steps.data ?? []).map((step) => ({ id: String(step.id), title: step.title, completed: Boolean(step.completed), dueDate: step.due_date ?? undefined })),
  };
}

async function insertSeedChildren(supabase: ReturnType<typeof createSupabaseServiceClient>, journeyId: string, seed: JourneyWorkspaceData) {
  await insertChildren(supabase, journeyId, seed);
}

async function insertChildren(supabase: ReturnType<typeof createSupabaseServiceClient>, journeyId: string, workspace: JourneyWorkspaceData) {
  const nodes = await supabase.from("journey_nodes").insert(workspace.nodes.map((node, index) => ({ id: node.id.match(/^[0-9a-f-]{36}$/i) ? node.id : undefined, journey_id: journeyId, category: node.category, title: node.title, description: node.description ?? "", status: node.status, completed: node.completed, completed_at: node.completedAt ?? null, level: node.level ?? null, sort_order: index })));
  if (nodes.error) throw nodes.error;
  const diary = await supabase.from("journey_diary_entries").insert(workspace.diary.map((entry) => ({ id: entry.id.match(/^[0-9a-f-]{36}$/i) ? entry.id : undefined, journey_id: journeyId, type: entry.type, title: entry.title, body: entry.body, entry_date: entry.entryDate, tags: entry.tags, milestone: entry.milestone ?? false })));
  if (diary.error) throw diary.error;
  const notes = await supabase.from("journey_quick_notes").insert(workspace.notes.map((note) => ({ id: note.id.match(/^[0-9a-f-]{36}$/i) ? note.id : undefined, journey_id: journeyId, body: note.body, pinned: note.pinned, created_at: `${note.createdAt}T12:00:00Z` })));
  if (notes.error) throw notes.error;
  const steps = await supabase.from("journey_next_steps").insert(workspace.nextSteps.map((step) => ({ id: step.id.match(/^[0-9a-f-]{36}$/i) ? step.id : undefined, journey_id: journeyId, title: step.title, completed: step.completed, due_date: step.dueDate ?? null })));
  if (steps.error) throw steps.error;
}

function kathmanduDate() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
