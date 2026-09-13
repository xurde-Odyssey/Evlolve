import { PageContainer } from "@/components/layout/page-container";
import { CommunicationLayout } from "@/components/communication/communication-layout";
import { CommunicationToday } from "@/components/communication/communication-today";

export default function CommunicationPage() {
  return <PageContainer><CommunicationLayout active="/communication" title="Communication" description="Build clearer, more natural English communication through deliberate practice."><CommunicationToday /></CommunicationLayout></PageContainer>;
}
