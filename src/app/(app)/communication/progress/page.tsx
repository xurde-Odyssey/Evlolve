import { PageContainer } from "@/components/layout/page-container";
import { CommunicationLayout } from "@/components/communication/communication-layout";
import { CommunicationProgress } from "@/components/communication/communication-progress";

export default function CommunicationProgressPage() {
  return <PageContainer><CommunicationLayout active="/communication/progress" title="Progress" description="See the communication dimensions that will become clearer through practice evidence."><CommunicationProgress /></CommunicationLayout></PageContainer>;
}
