import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAchievementSnapshot } from "@/application/evolve";
import { getAchievementHubViewModel } from "@/application/evolve/achievement-hub";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AchievementHubWorkspace } from "@/components/achievements/achievement-hub-workspace";

export default async function AchievementHubPage() {
  const state = await getCurrentEvolveState();
  const viewModel = getAchievementHubViewModel(getAchievementSnapshot(state), state.books);

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="/hub"
          title="Achievement Hub"
          description="A visual record of what your effort has built."
        />
        <Link
          href="/achievements"
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] sm:self-auto"
        >
          View all achievements
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <AchievementHubWorkspace viewModel={viewModel} />
    </PageContainer>
  );
}
