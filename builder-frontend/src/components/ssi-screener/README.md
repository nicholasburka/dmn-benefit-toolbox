# SSI Conversational Screener

A conversational AI-powered interface for SSI eligibility screening that uses natural language processing to gather information and determine eligibility.

## How It Works

1. **User Input**: User describes themselves in natural language (e.g., "I am a 70-year-old US citizen" or "I'm an LPR with blindness")
2. **AI Parsing**: Groq LLM parses the input and extracts relevant fields (citizenship status, date of birth, disability status, etc.)
3. **Gap Analysis**: System determines what information is still needed for eligibility determination
4. **Follow-up Questions**: If information is missing, generates contextual follow-up questions
5. **Eligibility Check**: Once all required info is gathered, calls library-api's SSI eligibility endpoint
6. **Results Display**: Shows eligibility determination with breakdown of individual checks

## Architecture

```
ConversationalScreener.tsx (Main UI)
  ↓
PersonaParser.ts (Groq LLM) → Extract tSituation fields
  ↓
GapAnalyzer.ts → Identify missing required fields
  ↓
QuestionGenerator.ts → Generate follow-up questions
  ↓
library-api /benefits/federal/ssi-eligibility → Evaluate eligibility
```

## Setup

### 1. Get Groq API Key

Sign up at [https://console.groq.com](https://console.groq.com) and get an API key.

### 2. Configure Environment

Add to `builder-frontend/.env`:

```bash
VITE_GROQ_API_KEY=your_actual_groq_api_key_here
```

### 3. Start Services

```bash
# Terminal 1: Start library-api (DMN evaluation)
cd library-api && quarkus dev

# Terminal 2: Start builder-frontend
cd builder-frontend && npm run dev
```

### 4. Access the Screener

Navigate to: [http://localhost:5173/ssi-screener](http://localhost:5173/ssi-screener)

## Example Conversations

### Example 1: Age-based Eligibility
```
User: I am a 70-year-old US citizen
Assistant: Got it! (citizenshipStatus: US_CITIZEN, dateOfBirth: [inferred])
Assistant: ✅ Based on the information provided, you appear to be eligible for SSI!
```

### Example 2: LPR with Disability
```
User: I'm an LPR with blindness
Assistant: Got it! (citizenshipStatus: LAWFUL_PERMANENT_RESIDENT, isBlindOrDisabled: true)
Assistant: What is your date of birth?
User: March 15, 1990
Assistant: ✅ Based on the information provided, you appear to be eligible for SSI!
```

### Example 3: Refugee (needs date)
```
User: I am a refugee with a disability
Assistant: Got it! (citizenshipStatus: REFUGEE, isBlindOrDisabled: true)
Assistant: When were you admitted to the United States as a refugee?
User: June 2020
Assistant: What is your date of birth?
User: April 5, 1985
Assistant: ✅ Based on the information provided, you appear to be eligible for SSI!
```

## Files

- **ConversationalScreener.tsx** - Main chat UI component
- **PersonaParser.ts** - Groq LLM integration for parsing natural language
- **GapAnalyzer.ts** - Logic to identify missing fields and build tSituation
- **QuestionGenerator.ts** - Generate follow-up questions based on missing data
- **types.ts** - TypeScript type definitions

## Current Limitations

- Only checks categorical and citizenship eligibility (not income, resources, or residence)
- Date parsing is handled by LLM (may vary in format)
- No conversation history persistence (resets on page reload)
- Assumes library-api is running at `http://localhost:8083/api/v1`

## Future Enhancements

- Add income and resource checks
- Persist conversation history
- Multi-language support
- Voice input/output
- Export conversation transcript
- Configurable API endpoint
