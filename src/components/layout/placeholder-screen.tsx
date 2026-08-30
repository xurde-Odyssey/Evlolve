import { appRoutes } from "@/config/navigation";
import { Card } from "@/components/ui/card";
import { PageContainer } from "./page-container";
import { PageHeader } from "./page-header";

type PlaceholderScreenProps = {
  route: string;
  title: string;
};

export function PlaceholderScreen({ route, title }: PlaceholderScreenProps) {
  const routeConfig = appRoutes.find((item) => item.href === route);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={route}
        title={title}
        description={
          routeConfig?.description ??
          "Placeholder route reserved for a later product phase."
        }
      />
      <Card className="max-w-3xl">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Route foundation
          </p>
          <p className="text-sm leading-6 text-[var(--foreground-muted)]">
            Structural placeholder only. Product systems, data, and progression
            mechanics will be designed in later phases.
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}
