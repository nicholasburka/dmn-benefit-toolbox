import Groq from "groq-sdk";
import { getFieldDescription } from "./GapAnalyzer";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const QUESTION_SYSTEM_PROMPT = `You are a helpful assistant helping someone determine their SSI eligibility.

Generate a natural, conversational follow-up question to gather the missing information.
Be empathetic and clear. Keep questions simple and direct.

Return ONLY the question text, nothing else.`;

export async function generateFollowUpQuestion(
  missingFields: string[],
  conversationHistory: string[] = []
): Promise<string> {
  // If no missing fields, shouldn't be called
  if (missingFields.length === 0) {
    return "Thank you for providing all the information!";
  }

  // Get the first missing field
  const nextField = missingFields[0];
  const fieldDescription = getFieldDescription(nextField);

  // Simple fallback questions
  const fallbackQuestions: Record<string, string> = {
    dateOfBirth: "What is your date of birth?",
    isBlindOrDisabled: "Are you blind or disabled?",
    citizenshipStatus: "What is your citizenship or immigration status?",
    refugeeAdmissionDate: "When were you admitted to the United States as a refugee?",
    asylumGrantDate: "When was your asylum granted?",
    withheldDeportationGrantDate: "When was your deportation withheld?",
    cubanHaitianEntryDate: "When did you enter the United States?",
    amerasianAdmissionDate: "When were you admitted to the United States?",
  };

  // Use fallback for speed and simplicity
  if (fallbackQuestions[nextField]) {
    return fallbackQuestions[nextField];
  }

  // LLM-based generation for more natural flow (optional enhancement)
  try {
    const historyContext = conversationHistory.length > 0
      ? `\n\nConversation so far:\n${conversationHistory.join("\n")}`
      : '';

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: QUESTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `I need to ask about: ${fieldDescription}${historyContext}\n\nGenerate a follow-up question.`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 100,
    });

    const question = completion.choices[0]?.message?.content?.trim() || fallbackQuestions[nextField] || "Can you provide more information?";
    return question;
  } catch (error) {
    console.error("Error generating question:", error);
    return fallbackQuestions[nextField] || "Can you provide more information?";
  }
}
