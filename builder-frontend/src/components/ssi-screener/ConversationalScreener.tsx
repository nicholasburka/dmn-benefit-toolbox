import { createSignal, For, Show } from "solid-js";
import { parsePersona } from "./PersonaParser";
import { analyzeGaps, buildSituation } from "./GapAnalyzer";
import { generateFollowUpQuestion } from "./QuestionGenerator";
import type { PersonaContext, Message } from "./types";

const LIBRARY_API_URL = "http://localhost:8083/api/v1";

export default function ConversationalScreener() {
  const [messages, setMessages] = createSignal<Message[]>([
    {
      role: "assistant",
      content: "Hi! I can help you check your SSI eligibility. Tell me about yourself (e.g., 'I am a 70-year-old US citizen' or 'I'm a LPR with blindness').",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = createSignal("");
  const [context, setContext] = createSignal<PersonaContext>({});
  const [isLoading, setIsLoading] = createSignal(false);
  const [eligibilityResult, setEligibilityResult] = createSignal<any>(null);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const evaluateEligibility = async (ctx: PersonaContext) => {
    try {
      const situation = buildSituation(ctx);
      const response = await fetch(`${LIBRARY_API_URL}/benefits/federal/ssi-eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(situation)
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const result = await response.json();
      setEligibilityResult(result);

      // Format eligibility message
      const isEligible = result.isEligible;
      const checks = result.checks || {};

      let message = isEligible
        ? "✅ Based on the information provided, you appear to be eligible for SSI!\n\n"
        : "❌ Based on the information provided, you may not be eligible for SSI.\n\n";

      message += "**Check Results:**\n";
      if (checks.categoricalEligible !== undefined) {
        message += `- Categorical eligibility (age/blind/disabled): ${checks.categoricalEligible ? '✓' : '✗'}\n`;
      }
      if (checks.citizenshipEligible !== undefined) {
        message += `- Citizenship eligibility: ${checks.citizenshipEligible ? '✓' : '✗'}\n`;
      }

      message += "\n*Note: This is a preliminary screening. Income, resources, and residence requirements also apply.*";

      addMessage("assistant", message);
    } catch (error) {
      console.error("Error evaluating eligibility:", error);
      addMessage("assistant", "Sorry, I encountered an error checking your eligibility. Please make sure the library-api is running at " + LIBRARY_API_URL);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const userInput = input().trim();
    if (!userInput || isLoading()) return;

    // Add user message
    addMessage("user", userInput);
    setInput("");
    setIsLoading(true);

    try {
      // Parse persona
      const updatedContext = await parsePersona(userInput, context());
      setContext(updatedContext);

      // Show what we understood
      const understood = Object.entries(updatedContext)
        .filter(([_, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      if (understood) {
        addMessage("assistant", `Got it! (${understood})`);
      }

      // Analyze gaps
      const missingFields = analyzeGaps(updatedContext);

      if (missingFields.length === 0) {
        // We have everything, evaluate eligibility
        addMessage("assistant", "Great! I have all the information I need. Let me check your eligibility...");
        await evaluateEligibility(updatedContext);
      } else {
        // Ask follow-up question
        const conversationHistory = messages().map(m => `${m.role}: ${m.content}`);
        const question = await generateFollowUpQuestion(missingFields, conversationHistory);
        addMessage("assistant", question);
      }
    } catch (error) {
      console.error("Error processing input:", error);
      addMessage("assistant", "Sorry, I had trouble understanding that. Could you rephrase?");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I can help you check your SSI eligibility. Tell me about yourself (e.g., 'I am a 70-year-old US citizen' or 'I'm a LPR with blindness').",
        timestamp: new Date()
      }
    ]);
    setContext({});
    setEligibilityResult(null);
  };

  return (
    <div class="min-h-screen bg-gray-50 p-4">
      <div class="max-w-3xl mx-auto">
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div class="bg-blue-600 text-white p-4 flex justify-between items-center">
            <div>
              <h1 class="text-2xl font-bold">SSI Eligibility Screener</h1>
              <p class="text-sm text-blue-100">Conversational eligibility checker</p>
            </div>
            <button
              onClick={reset}
              class="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-sm transition-colors"
            >
              Start Over
            </button>
          </div>

          {/* Chat Messages */}
          <div class="h-96 overflow-y-auto p-4 space-y-4">
            <For each={messages()}>
              {(message) => (
                <div
                  class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    class={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div class="whitespace-pre-wrap">{message.content}</div>
                    <div class="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}
            </For>
            <Show when={isLoading()}>
              <div class="flex justify-start">
                <div class="bg-gray-200 text-gray-800 rounded-lg px-4 py-2">
                  <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                    <div class="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                    <div class="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                  </div>
                </div>
              </div>
            </Show>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} class="border-t border-gray-200 p-4">
            <div class="flex space-x-2">
              <input
                type="text"
                value={input()}
                onInput={(e) => setInput(e.currentTarget.value)}
                placeholder="Type your message..."
                class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                disabled={isLoading()}
              />
              <button
                type="submit"
                disabled={isLoading() || !input().trim()}
                class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </form>

          {/* Current Context Display */}
          <Show when={Object.keys(context()).length > 0}>
            <div class="border-t border-gray-200 p-4 bg-gray-50">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">What I know so far:</h3>
              <div class="text-xs text-gray-600 space-y-1">
                <For each={Object.entries(context())}>
                  {([key, value]) => (
                    <Show when={value !== undefined && value !== null && value !== ""}>
                      <div>
                        <span class="font-medium">{key}:</span> {String(value)}
                      </div>
                    </Show>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>

        {/* Instructions */}
        <div class="mt-4 text-sm text-gray-600 bg-white p-4 rounded-lg shadow">
          <h3 class="font-semibold mb-2">How to use:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li>Describe yourself in natural language</li>
            <li>Answer follow-up questions to complete the screening</li>
            <li>The system will determine your SSI eligibility based on categorical and citizenship requirements</li>
          </ul>
          <p class="mt-2 text-xs text-gray-500">
            <strong>Note:</strong> Make sure library-api is running at {LIBRARY_API_URL}
          </p>
        </div>
      </div>
    </div>
  );
}
