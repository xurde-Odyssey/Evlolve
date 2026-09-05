import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { getReportsViewModel } from "@/application/evolve";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";

export default async function ReportsPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="/reports"
        title="Reports & Analytics"
        description="Evidence from activity, commitments, reading, consistency, and progression history."
      />
      <ReportsWorkspace snapshot={getReportsViewModel(state)} />
    </PageContainer>
  );
}
