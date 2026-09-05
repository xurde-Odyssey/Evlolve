import { PageContainer } from "@/components/layout/page-container";
import { AuthWorkspace } from "@/components/auth/auth-workspace";

type AuthPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/dashboard";

  return (
    <PageContainer>
      <AuthWorkspace nextPath={nextPath} errorMessage={params.error} />
    </PageContainer>
  );
}
