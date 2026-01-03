import Groq from "groq-sdk";
import type { PersonaContext } from "./types";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are a parser that extracts SSI eligibility information from natural language.

Extract the following fields when mentioned:
- dateOfBirth: Date in YYYY-MM-DD format (parse dates like "March 15, 1990" -> "1990-03-15")
  - If user states their age (e.g., "I am 64 years old"), calculate approximate dateOfBirth by subtracting age from current year and using January 1st
  - Example: "I am 64" in 2026 -> "1962-01-01"
- citizenshipStatus: One of: US_CITIZEN, LAWFUL_PERMANENT_RESIDENT, REFUGEE, ASYLEE, CUBAN_HAITIAN_ENTRANT, VIETNAMESE_AMERASIAN, WITHHOLDING_DEPORTATION, PAROLED_ALIEN
- isBlindOrDisabled: true if person mentions blindness, disability, or being disabled
- refugeeAdmissionDate: Date when admitted as refugee (YYYY-MM-DD)
- asylumGrantDate: Date when asylum was granted (YYYY-MM-DD)
- withheldDeportationGrantDate: Date when deportation was withheld (YYYY-MM-DD)
- cubanHaitianEntryDate: Date of entry for Cuban/Haitian entrants (YYYY-MM-DD)
- amerasianAdmissionDate: Date of admission for Vietnamese Amerasians (YYYY-MM-DD)

Common mappings:
- "LPR", "green card", "permanent resident" -> LAWFUL_PERMANENT_RESIDENT
- "US citizen", "American citizen" -> US_CITIZEN
- "blind", "blindness", "vision impairment" -> isBlindOrDisabled: true
- "disabled", "disability" -> isBlindOrDisabled: true
- "64 years old", "I am 64" -> calculate dateOfBirth

Return ONLY a JSON object with the extracted fields. Do not include fields that are not mentioned.

Example:
Input: "I am a LPR with blindness"
Output: {"citizenshipStatus": "LAWFUL_PERMANENT_RESIDENT", "isBlindOrDisabled": true}

Input: "I'm a US citizen born on June 15, 1955"
Output: {"citizenshipStatus": "US_CITIZEN", "dateOfBirth": "1955-06-15"}

Input: "I am 64 years old and disabled"
Output: {"dateOfBirth": "1962-01-01", "isBlindOrDisabled": true}`;

export async function parsePersona(input: string, existingContext: PersonaContext = {}): Promise<PersonaContext> {
  try {
    const contextPrompt = Object.keys(existingContext).length > 0
      ? `\n\nExisting context: ${JSON.stringify(existingContext)}\nMerge new information with existing context.`
      : '';

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextPrompt },
        { role: "user", content: input }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";

    // Extract JSON from response (in case model adds explanation)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

    const parsed = JSON.parse(jsonStr);

    // Merge with existing context
    return { ...existingContext, ...parsed };
  } catch (error) {
    console.error("Error parsing persona:", error);
    return existingContext;
  }
}
