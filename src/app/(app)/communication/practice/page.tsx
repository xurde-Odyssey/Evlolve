import { PageContainer } from "@/components/layout/page-container";
import { CommunicationLayout } from "@/components/communication/communication-layout";
import { CommunicationPractice } from "@/components/communication/communication-practice";

export default function CommunicationPracticePage() {
  return <PageContainer><CommunicationLayout active="/communication/practice" title="Practice" description="Choose the kind of communication work you want to develop today."><CommunicationPractice /></CommunicationLayout></PageContainer>;
}
