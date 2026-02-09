/**
 * Local AI Service using the Microsoft Edge Prompt API
 * https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api
 *
 * This service provides the same AI functionality as the server-side OpenAI
 * but runs entirely in the browser using a local LLM when available.
 */

// Cache the AI session for reuse
let aiSession = null;
let aiCapabilities = null;

/**
 * Check if the Prompt API is available in the current browser
 */
export async function isPromptApiAvailable() {
  if (typeof window === "undefined") return false;
  if (!window.LanguageModel) return false;

  try {
    aiCapabilities = await window.LanguageModel.availability();
    return aiCapabilities === "available" || aiCapabilities === "downloadable";
  } catch {
    return false;
  }
}

/**
 * Get the current availability status of the local AI
 */
export async function getAiStatus() {
  if (!window.LanguageModel) {
    return { available: false, reason: "Prompt API not supported in this browser" };
  }

  try {
    const availability = await window.LanguageModel.availability();
    switch (availability) {
      case "available":
        return { available: true, status: "ready", message: "Local AI is ready" };
      case "downloadable":
        return {
          available: true,
          status: "downloadable",
          message: "Local AI model can be downloaded",
        };
      case "downloading":
        return {
          available: false,
          status: "downloading",
          message: "Local AI model is downloading...",
        };
      case "unavailable":
      default:
        return { available: false, reason: "Local AI model is not available" };
    }
  } catch (err) {
    return { available: false, reason: err.message };
  }
}

/**
 * Initialize or get the AI session
 */
async function getSession(systemPrompt) {
  // If we have a session with the same system prompt, reuse it
  if (aiSession) {
    return aiSession;
  }

  const options = {};
  if (systemPrompt) {
    options.systemPrompt = systemPrompt;
  }

  // Monitor download progress if needed
  options.monitor = (monitor) => {
    monitor.addEventListener("downloadprogress", (e) => {
      console.log(`[LocalAI] Downloading model: ${Math.round((e.loaded / e.total) * 100)}%`);
    });
  };

  aiSession = await window.LanguageModel.create(options);
  return aiSession;
}

/**
 * Destroy the current session to free resources
 */
export function destroySession() {
  if (aiSession) {
    aiSession.destroy();
    aiSession = null;
  }
}

// ─── CoupleChoc-specific prompts ───────────────────────────

const SYSTEM_PROMPTS = {
  chat: `You are a friendly and witty chocolate & dating assistant for CoupleChoc, a Valentine's matchmaking app. 
Keep responses concise (2-3 sentences max), fun, and focused on chocolate and relationships. 
Use chocolate metaphors when appropriate. Include 1-2 relevant emojis per response.`,

  pairing: `You are a master chocolatier and romantic advisor for CoupleChoc.
Given two people's profiles, recommend a perfect chocolate pairing for their date.
Format your response with:
- A romantic chocolate pairing name
- Which chocolates each person should have (referencing their interests/vibe)
- A short explanation of why this pairing works
Keep it under 150 words. Use chocolate emojis.`,

  conversationPrompt: `You are a romantic message writer for CoupleChoc gift packages.
Generate a sweet, short message (2-3 sentences) to include with a chocolate gift shipment.
Make it romantic but not overly cheesy. Include 1-2 emojis.`,

  memoryCard: `You are creating a keepsake memory card for a CoupleChoc chocolate date.
Write a beautiful, sentimental message celebrating this couple's chocolate date.
Include poetic chocolate metaphors. Keep it to 3-4 sentences maximum.
Format with line breaks for readability.`,

  matchExplanation: `You are Cupid's assistant explaining why two people are compatible.
Given their compatibility score and shared interests, write a brief, playful explanation
of why they're a great match. Keep it to 2 sentences. Be charming and use love/chocolate metaphors.`,
};

// ─── AI Function Implementations ───────────────────────────

/**
 * Send a chat message using local AI
 */
export async function localSendChat(messages, context) {
  const systemPrompt = `${SYSTEM_PROMPTS.chat}\n\nContext: ${context}`;
  const session = await getSession(systemPrompt);

  // Build conversation history for context
  const conversationHistory = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.content || "";
  const prompt = conversationHistory
    ? `Previous conversation:\n${conversationHistory}\n\nUser's current message: ${lastUserMessage}\n\nRespond helpfully:`
    : lastUserMessage;

  const reply = await session.prompt(prompt);
  return { reply: reply.trim() };
}

/**
 * Get chocolate pairing recommendation using local AI
 */
export async function localGetPairing(player1, player2) {
  const session = await getSession(SYSTEM_PROMPTS.pairing);

  const prompt = `Create a chocolate pairing for this couple's date:

Person 1 - ${player1.name}:
- Age: ${player1.age}
- Vibe: ${player1.vibe}
- Interests: ${player1.interests.join(", ")}
- Region: ${player1.region}

Person 2 - ${player2.name}:
- Age: ${player2.age}
- Vibe: ${player2.vibe}
- Interests: ${player2.interests.join(", ")}
- Region: ${player2.region}

Recommend the perfect chocolate pairing:`;

  const pairing = await session.prompt(prompt);
  return { pairing: pairing.trim() };
}

/**
 * Get a conversation prompt/gift message using local AI
 */
export async function localGetConversationPrompt() {
  const session = await getSession(SYSTEM_PROMPTS.conversationPrompt);

  const prompt = `Write a sweet message to include with a Valentine's chocolate gift shipment for a couple who just matched on CoupleChoc:`;

  const result = await session.prompt(prompt);
  return { prompt: result.trim() };
}

/**
 * Generate a memory card using local AI
 */
export async function localGetMemoryCard(player1Name, player2Name, highlights) {
  const session = await getSession(SYSTEM_PROMPTS.memoryCard);

  const prompt = `Create a memory card for ${player1Name} & ${player2Name}'s chocolate date.

Their date highlights: ${highlights}

Write the memory card message:`;

  const card = await session.prompt(prompt);
  return { card: card.trim() };
}

/**
 * Get match explanation using local AI
 */
export async function localGetMatchExplanation(
  player1,
  player2,
  score,
  breakdown,
  sharedInterests
) {
  const session = await getSession(SYSTEM_PROMPTS.matchExplanation);

  const prompt = `Explain why ${player1.name} and ${player2.name} are a ${score}% match.

Shared interests: ${sharedInterests.join(", ") || "varied tastes"}
Personality match: ${Math.round(breakdown.ocean * 100)}%
Interest overlap: ${Math.round(breakdown.interests * 100)}%

Write a brief, charming explanation:`;

  const explanation = await session.prompt(prompt);
  return { explanation: explanation.trim() };
}
