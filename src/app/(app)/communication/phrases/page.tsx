import { PageContainer } from "@/components/layout/page-container";
import { CommunicationLayout } from "@/components/communication/communication-layout";
import { CommunicationPhraseBank } from "@/components/communication/communication-phrase-bank";

export default function CommunicationPhrasesPage() {
  return <PageContainer><CommunicationLayout active="/communication/phrases" title="Phrase Bank" description="Keep useful conversational language close to the work of becoming more natural."><CommunicationPhraseBank /></CommunicationLayout></PageContainer>;
}
