import type {
  CommunicationDifficulty,
  CommunicationMeaningContent,
  CommunicationMeaningCorrectness,
  CommunicationMeaningItem,
  CommunicationMeaningQuestionType,
} from "@/types/communication";

export type MeaningSeed = {
  phrase: string;
  shortMeaning: string;
  fullMeaning: string;
  context: string;
  category: string;
  difficulty: Exclude<CommunicationDifficulty, "ADAPTIVE">;
  questionType: CommunicationMeaningQuestionType;
  options: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  relatedPhrase?: string;
  usageNotes?: string;
};

export const meaningLibrary: readonly MeaningSeed[] = [
  { phrase: "fair enough", shortMeaning: "I understand and accept your point.", fullMeaning: "An acknowledgement that accepts someone's point without necessarily meaning full agreement.", context: 'A: "I prefer working somewhere quieter."\nB: "Fair enough."', category: "Acknowledgement", difficulty: "EASY", questionType: "WHAT_DOES_IT_MEAN", options: ["I completely agree", "I understand and accept your point", "I do not believe you", "Explain again"], correctAnswer: "I understand and accept your point", relatedPhrase: "That makes sense." },
  { phrase: "that makes sense", shortMeaning: "I understand why that is reasonable.", fullMeaning: "A natural way to show that an explanation or decision is understandable.", context: 'A: "The train was delayed, so I took a taxi."\nB: "That makes sense."', category: "Understanding", difficulty: "EASY", questionType: "SAME_MEANING", options: ["I understand why", "I disagree", "I am confused", "I refuse"], correctAnswer: "I understand why", relatedPhrase: "I see what you mean." },
  { phrase: "I wouldn't go that far", shortMeaning: "I think that conclusion is too strong.", fullMeaning: "A polite way to disagree with an exaggerated or overly strong conclusion.", context: 'A: "Anyone who works late is very productive."\nB: "I wouldn\'t go that far."', category: "Soft disagreement", difficulty: "NORMAL", questionType: "WHAT_DOES_IT_MEAN", options: ["I strongly agree", "Your conclusion seems too strong", "I want to leave now", "I did not hear you"], correctAnswer: "Your conclusion seems too strong", relatedPhrase: "I see your point, but..." },
  { phrase: "I've got an early start tomorrow", shortMeaning: "I may be declining because tomorrow begins early.", fullMeaning: "In an invitation context, this often communicates an indirect and polite refusal.", context: 'A: "Do you want to come out tonight?"\nB: "I\'ve got an early start tomorrow."', category: "Indirect Refusal", difficulty: "NORMAL", questionType: "REALLY_SAYING", options: ["B is probably declining", "B wants to stay out later", "B is asking for directions", "B is excited about the invitation"], correctAnswer: "B is probably declining", relatedPhrase: "Maybe another time." },
  { phrase: "up to you", shortMeaning: "You can decide.", fullMeaning: "The choice is yours; the speaker is willing to follow your decision.", context: 'A: "We can grab coffee or head home."\nB: "Up to you."', category: "Choice", difficulty: "EASY", questionType: "BEST_RESPONSE", options: ["I will decide", "I do not understand", "That is impossible", "I disagree"], correctAnswer: "I will decide", relatedPhrase: "Your call." },
  { phrase: "I'll think about it", shortMeaning: "I have not decided yet.", fullMeaning: "A polite way to delay a decision without promising agreement.", context: 'A: "Would you like to join the project?"\nB: "I\'ll think about it."', category: "Uncertainty", difficulty: "NORMAL", questionType: "REALLY_SAYING", options: ["B has definitely agreed", "B has not decided yet", "B is ending the project", "B did not hear the question"], correctAnswer: "B has not decided yet", relatedPhrase: "We'll see." },
  { phrase: "not really my thing", shortMeaning: "I do not particularly enjoy it.", fullMeaning: "A casual, indirect way to say something is not your preference.", context: 'A: "Do you enjoy crowded clubs?"\nB: "Not really my thing."', category: "Opinion", difficulty: "EASY", questionType: "SAME_MEANING", options: ["I do not really enjoy it", "I am an expert at it", "I want more of it", "I have never seen it"], correctAnswer: "I do not really enjoy it", relatedPhrase: "I'm not really into it." },
  { phrase: "give me a second", shortMeaning: "Please wait briefly.", fullMeaning: "A casual request for a small amount of time before responding or acting.", context: 'A: "Can you help me find the file?"\nB: "Give me a second."', category: "Delay", difficulty: "EASY", questionType: "BEST_RESPONSE", options: ["Wait briefly", "Leave immediately", "Speak louder", "Choose another file"], correctAnswer: "Wait briefly", relatedPhrase: "Just a moment." },
  { phrase: "you've got a point", shortMeaning: "What you said is a valid consideration.", fullMeaning: "An acknowledgement that another person's argument has some merit, without necessarily agreeing with everything.", context: 'A: "Working from home saves commuting time."\nB: "You\'ve got a point."', category: "Agreement", difficulty: "NORMAL", questionType: "WHAT_DOES_IT_MEAN", options: ["Your idea has merit", "You are completely wrong", "Speak more quickly", "I am leaving"], correctAnswer: "Your idea has merit", relatedPhrase: "That's a good point." },
  { phrase: "we'll see", shortMeaning: "Maybe; it is not decided.", fullMeaning: "A context-dependent response that often signals uncertainty rather than a firm commitment.", context: 'A: "Will you definitely come tomorrow?"\nB: "We\'ll see."', category: "Uncertainty", difficulty: "CHALLENGING", questionType: "REALLY_SAYING", options: ["B is making a definite promise", "B is uncertain", "B is refusing to listen", "B is asking what time it is"], correctAnswer: "B is uncertain", relatedPhrase: "I'll think about it." },
  { phrase: "I see what you mean", shortMeaning: "I understand your perspective.", fullMeaning: "A response showing that you now understand how someone reached their point.", context: 'A: "The cheaper option takes twice as long to arrive."\nB: "I see what you mean."', category: "Understanding", difficulty: "EASY", questionType: "SAME_MEANING", options: ["I understand your perspective", "I want to interrupt", "I refuse the option", "I did not hear you"], correctAnswer: "I understand your perspective", relatedPhrase: "That makes sense." },
  { phrase: "maybe another time", shortMeaning: "Not now, but perhaps later.", fullMeaning: "A polite way to decline an invitation without closing the possibility completely.", context: 'A: "Want to join us for dinner?"\nB: "Maybe another time."', category: "Indirect Refusal", difficulty: "NORMAL", questionType: "REALLY_SAYING", options: ["B is probably declining for now", "B is asking for the menu", "B has already arrived", "B strongly agrees"], correctAnswer: "B is probably declining for now", relatedPhrase: "I can't make it tonight." },
  { phrase: "it depends", shortMeaning: "The answer changes with the situation.", fullMeaning: "A way to say that one simple answer does not fit every circumstance.", context: 'A: "Is remote work better?"\nB: "It depends on the kind of work."', category: "Uncertainty", difficulty: "EASY", questionType: "BEST_RESPONSE", options: ["The answer changes with the situation", "The answer is always no", "I did not hear you", "I want to change the subject"], correctAnswer: "The answer changes with the situation", relatedPhrase: "That depends on..." },
  { phrase: "that's one way of looking at it", shortMeaning: "That is one possible perspective.", fullMeaning: "A gentle way to acknowledge an opinion while leaving room for a different view.", context: 'A: "The deadline forced us to make faster decisions."\nB: "That\'s one way of looking at it."', category: "Soft disagreement", difficulty: "CHALLENGING", questionType: "WHAT_DOES_IT_MEAN", options: ["There is only one correct view", "That is one possible perspective", "I agree completely", "I want more details about the deadline"], correctAnswer: "That is one possible perspective", relatedPhrase: "I see your point, but..." },
  { phrase: "no worries", shortMeaning: "It is okay; do not worry.", fullMeaning: "A relaxed response that reassures someone after an apology or small inconvenience.", context: 'A: "Sorry I\'m a few minutes late."\nB: "No worries."', category: "Reaction", difficulty: "EASY", questionType: "BEST_RESPONSE", options: ["It is okay", "You are in trouble", "Please leave", "I need an explanation"], correctAnswer: "It is okay", relatedPhrase: "That's alright." },
  { phrase: "I didn't catch that", shortMeaning: "I did not hear or understand what you said.", fullMeaning: "A polite request for someone to repeat themselves.", context: 'A: "The meeting starts at quarter past seven."\nB: "Sorry, I didn\'t catch that."', category: "Clarification", difficulty: "EASY", questionType: "BEST_RESPONSE", options: ["Please repeat it", "End the meeting", "Speak about something else", "I agree with the time"], correctAnswer: "Please repeat it", relatedPhrase: "Could you say that again?" },
  { phrase: "I don't mind", shortMeaning: "Either option is acceptable to me.", fullMeaning: "A neutral statement meaning you have no strong preference, not that you do not care about the situation.", context: 'A: "Would you rather sit inside or outside?"\nB: "I don\'t mind."', category: "Preference", difficulty: "NORMAL", questionType: "SAME_MEANING", options: ["Either option is acceptable", "I strongly dislike both", "I do not care about you", "I have already left"], correctAnswer: "Either option is acceptable", relatedPhrase: "Either is fine." },
  { phrase: "sounds good", shortMeaning: "That plan or suggestion is acceptable.", fullMeaning: "A natural positive response to a proposed plan, without needing to mean excitement.", context: 'A: "How about meeting at six?"\nB: "Sounds good."', category: "Agreement", difficulty: "EASY", questionType: "MINI_CONVERSATION", options: ["Agree to the plan", "Reject the plan", "Ask for directions", "Say the plan is confusing"], correctAnswer: "Agree to the plan", acceptedAnswers: ["agree", "okay", "fine", "works for me"], relatedPhrase: "That works for me." },
  { phrase: "not that I know of", shortMeaning: "As far as I know, no.", fullMeaning: "A cautious way to say you do not know of any example while leaving room for missing information.", context: 'A: "Has anyone called about the delivery?"\nB: "Not that I know of."', category: "Uncertainty", difficulty: "CHALLENGING", questionType: "WHAT_DOES_IT_MEAN", options: ["As far as I know, no", "I definitely know yes", "I want to make the call", "I am refusing to answer"], correctAnswer: "As far as I know, no", relatedPhrase: "As far as I know..." },
];

export function buildMeaningItems(difficulty: CommunicationDifficulty, count = 8): Omit<CommunicationMeaningItem, "id" | "sessionId" | "createdAt">[] {
  const allowed = difficulty === "ADAPTIVE" ? meaningLibrary : meaningLibrary.filter((item) => item.difficulty === difficulty || difficulty === "CHALLENGING" || item.difficulty === "EASY");
  const pool = allowed.length ? allowed : meaningLibrary;
  return Array.from({ length: Math.min(count, pool.length) }, (_, index) => {
    const item = pool[index % pool.length];
    if (!item) throw new Error("Meaning library is empty");
    const content: CommunicationMeaningContent = { phrase: item.phrase, context: item.context, prompt: promptFor(item.questionType, item.phrase), options: item.options, correctAnswer: item.correctAnswer, acceptedAnswers: item.acceptedAnswers, explanation: item.fullMeaning, shortMeaning: item.shortMeaning, relatedPhrase: item.relatedPhrase };
    return { phraseId: undefined, questionType: item.questionType, content, difficulty, category: item.category, sequence: index + 1 };
  });
}

function promptFor(type: CommunicationMeaningQuestionType, phrase: string) {
  if (type === "REALLY_SAYING") return "What are they most likely communicating?";
  if (type === "BEST_RESPONSE") return `What does “${phrase}” communicate here?`;
  if (type === "SAME_MEANING") return "Which option is closest in meaning?";
  if (type === "MINI_CONVERSATION") return "What would be a natural response or interpretation?";
  return `What does “${phrase}” mean in this context?`;
}

export function evaluateMeaningAnswer(item: Pick<CommunicationMeaningItem, "content" | "questionType">, response: string): { correctness: CommunicationMeaningCorrectness; analysis: { explanation: string; correctAnswer: string; shortMeaning: string; relatedPhrase?: string } } {
  const answer = normalize(response);
  const exact = normalize(item.content.correctAnswer);
  const accepted = (item.content.acceptedAnswers ?? []).map(normalize);
  const correct = answer === exact || accepted.includes(answer) || (answer.length > 0 && accepted.some((value) => answer.includes(value)));
  const partial = item.questionType === "MINI_CONVERSATION" && answer.length > 0 && (answer.includes("understand") || answer.includes("agree") || answer.includes("okay") || answer.includes("fine"));
  return { correctness: correct ? "CORRECT" : partial ? "PARTIAL" : "INCORRECT", analysis: { explanation: item.content.explanation, correctAnswer: item.content.correctAnswer, shortMeaning: item.content.shortMeaning, relatedPhrase: item.content.relatedPhrase } };
}

export function normalize(value: string) { return value.trim().toLocaleLowerCase().replace(/[.!?,;:]+$/g, "").replace(/\s+/g, " "); }
