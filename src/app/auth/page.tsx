import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export default function AuthPlaceholderPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="/auth"
        title="Authentication"
        description="Placeholder route reserved for a later authentication phase."
      />
    </PageContainer>
  );
}
