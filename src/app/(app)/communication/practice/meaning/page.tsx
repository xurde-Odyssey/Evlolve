import { PageContainer } from "@/components/layout/page-container";
import { CommunicationLayout } from "@/components/communication/communication-layout";
import { UnderstandMeaning } from "@/components/communication/understand-meaning";

export default function UnderstandMeaningPage() {
  return <PageContainer><CommunicationLayout active="/communication/practice" title="Understand Meaning" description="Read the context, infer the intention, and respond naturally."><UnderstandMeaning /></CommunicationLayout></PageContainer>;
}
