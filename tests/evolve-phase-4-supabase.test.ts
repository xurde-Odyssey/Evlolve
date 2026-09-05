import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260904000000_phase_4_core.sql"),
  "utf8",
);

describe("Phase 4 Supabase migration contract", () => {
  it("creates persistence tables for facts, derived state, snapshots, and events", () => {
    [
      "profiles",
      "growth_commitments",
      "commitment_targets",
      "scheduled_requirements",
      "activity_records",
      "activity_execution_evidence",
      "books",
      "exclusion_periods",
      "behavior_events",
      "restraint_contracts",
      "weekly_reminders",
      "boss_challenges",
      "boss_evidence",
      "recommendations",
      "xp_transactions",
      "user_progression_state",
      "progression_events",
      "weekly_development_snapshots",
      "monthly_development_snapshots",
      "achievement_awards",
      "title_awards",
      "commitment_capacity_state",
      "journey_events",
      "engine_closeouts",
    ].forEach((table) => {
      assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    });
  });

  it("enables RLS and user-owned select policies for private user tables", () => {
    [
      "activity_records",
      "activity_execution_evidence",
      "behavior_events",
      "boss_challenges",
      "recommendations",
      "xp_transactions",
      "user_progression_state",
      "weekly_development_snapshots",
      "monthly_development_snapshots",
      "journey_events",
    ].forEach((table) => {
      assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(migration, new RegExp(`on public\\.${table} for select using \\(auth\\.uid\\(\\) = user_id\\)`));
    });
  });

  it("keeps consequential derived tables server-writable only", () => {
    [
      "xp_transactions",
      "user_progression_state",
      "progression_events",
      "weekly_development_snapshots",
      "monthly_development_snapshots",
      "achievement_awards",
      "boss_challenges",
      "recommendations",
      "commitment_capacity_state",
      "engine_closeouts",
    ].forEach((table) => {
      assert.doesNotMatch(
        migration,
        new RegExp(`create policy .* on public\\.${table} for (insert|update|delete)`, "i"),
      );
    });
  });

  it("defines idempotency and immutable-history constraints", () => {
    assert.match(migration, /unique \(user_id, idempotency_key\)/);
    assert.match(migration, /unique \(user_id, source_type, source_id, category\)/);
    assert.match(migration, /unique \(user_id, period_type, period_key\)/);
    assert.match(migration, /record_status text not null default 'ACTIVE'/);
    assert.match(migration, /supersedes_record_id uuid references public\.activity_records/);
    assert.match(migration, /amount integer not null check \(amount >= 0\)/);
  });

  it("bootstraps profiles from Supabase Auth users", () => {
    assert.match(migration, /create or replace function public\.bootstrap_profile\(\)/);
    assert.match(migration, /create trigger on_auth_user_created/);
    assert.match(migration, /after insert on auth\.users/);
  });
});
