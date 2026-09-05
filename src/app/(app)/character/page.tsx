import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { getProfileViewModel } from "@/application/evolve";
import { getCurrentEvolveState } from "@/application/evolve/server/queries";

export default async function CharacterPage() {
  const state = await getCurrentEvolveState();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="/character"
        title="Profile / Character"
        description="Identity, discipline, records, and evidence of long-term development."
      />
      <ProfileWorkspace profile={getProfileViewModel(state)} />
    </PageContainer>
  );
}
