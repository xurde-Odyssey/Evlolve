import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { demoReportsSnapshot } from "@/lib/demo/report-demo-data";

export default function ReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="/reports"
        title="Reports & Analytics"
        description="Evidence from activity, commitments, reading, consistency, and progression history."
      />
      <ReportsWorkspace snapshot={demoReportsSnapshot} />
    </PageContainer>
  );
}
