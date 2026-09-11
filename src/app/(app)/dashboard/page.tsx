import { LatestAchievementPreview } from "@/components/achievements/latest-achievement-preview";
import { BossPreview } from "@/components/boss/boss-preview";
import { CharacterAttributes } from "@/components/dashboard/character-attributes";
import { BookOverviewKpi } from "@/components/dashboard/book-overview-kpi";
import { ConsistencyOverview } from "@/components/dashboard/consistency-overview";
import { DashboardIdentity } from "@/components/dashboard/dashboard-identity";
import { TodayExecution } from "@/components/dashboard/today-execution";
import { ImprovementsPreview } from "@/components/improvements/improvements-preview";
import { PageContainer } from "@/components/layout/page-container";
import { DailyQuests } from "@/components/quests/daily-quests";
import { getDashboardQuery } from "@/application/evolve/server/queries";
import { completeWeeklyReminderAction } from "./actions";
import { lookupBookMetadata } from "@/lib/books/open-library";
import Image from "next/image";

export default async function DashboardPage() {
  const dashboard = await getDashboardQuery();
  const currentBook = dashboard.bookOverview.currentBook;
  const freshBookMetadata = currentBook && !currentBook.metadata
    ? await lookupBookMetadata(currentBook.title)
    : undefined;
  const bookMetadata = currentBook?.metadata ?? freshBookMetadata;

  return (
    <PageContainer>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <div className="space-y-6">
          <DashboardIdentity character={dashboard.character} />
          <ConsistencyOverview consistency={dashboard.consistency} />
        </div>
        <CharacterAttributes
          attributes={dashboard.attributes}
          now={dashboard.now}
          timezone={dashboard.timePolicy.timezone}
        />
      </div>
      <TodayExecution
        execution={dashboard.dailyExecution}
        completeWeeklyReminderAction={completeWeeklyReminderAction}
      />
      <BossPreview challenge={dashboard.dashboardBoss} />
      <LatestAchievementPreview achievement={dashboard.latestAchievement} />
      <ImprovementsPreview
        areas={dashboard.improvements.areas.slice(0, 3)}
        capacity={dashboard.improvements.commitmentCapacity}
      />
      <DailyQuests
        evidence={dashboard.evidence}
        weeklyReminders={dashboard.weeklyReminders.reminders}
        quests={dashboard.dailyQuests}
        weeklyRequirements={dashboard.weeklyRequirements}
        now={dashboard.now}
        timePolicy={dashboard.timePolicy}
      />
      <BookOverviewKpi
        book={currentBook}
        metadata={bookMetadata}
        completedBooks={dashboard.bookOverview.completedBooks}
      />
      <div className="dashboard-wall-gallery" aria-label="Evolve focus artwork">
        {["/background.png", "/seond.jpeg"].map((image, index) => (
          <figure className="dashboard-wall-frame" key={image}>
            <div className="dashboard-wall-frame-mat">
              <Image
                src={image}
                alt={index === 0 ? "Focused personal development workspace" : "Personal development workspace"}
                fill
                sizes="(max-width: 768px) 100vw, 42rem"
              />
            </div>
          </figure>
        ))}
      </div>
    </PageContainer>
  );
}
