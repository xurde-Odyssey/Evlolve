import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { demoProfile } from "@/lib/demo/profile-demo-data";

export default function CharacterPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="/character"
        title="Profile / Character"
        description="Identity, discipline, records, and evidence of long-term development."
      />
      <ProfileWorkspace profile={demoProfile} />
    </PageContainer>
  );
}
