const API_BASE = "/api";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API request failed");
  }
  return res.json();
}

// ─── Data endpoints ────────────────────────────────────────

export const getProducts = () => fetchJson(`${API_BASE}/products`);

export const getProductsWithStock = () =>
  fetchJson(`${API_BASE}/products/with-stock`);

export const getTopFlavors = (limit = 10) =>
  fetchJson(`${API_BASE}/flavors/top?limit=${limit}`);

export const getFunFacts = () => fetchJson(`${API_BASE}/fun-facts`);

export const getGifts = (persona = "Partner") =>
  fetchJson(`${API_BASE}/gifts?persona=${persona}`);

// ─── Matching / Leaderboard endpoints ──────────────────────

export const getTopCouples = (limit = 20) =>
  fetchJson(`${API_BASE}/matches/top-couples?limit=${limit}`);

export const getMatchExplanation = (player1, player2, score, breakdown, sharedInterests) =>
  fetchJson(`${API_BASE}/matches/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player1, player2, score, breakdown, sharedInterests }),
  });

// ─── AI Agent endpoints ────────────────────────────────────

export const sendChat = (messages, context) =>
  fetchJson(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });

export const getPairing = (player1, player2) =>
  fetchJson(`${API_BASE}/pairing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player1, player2 }),
  });

export const getConversationPrompt = () =>
  fetchJson(`${API_BASE}/conversation-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

export const getMemoryCard = (player1Name, player2Name, highlights) =>
  fetchJson(`${API_BASE}/memory-card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player1Name, player2Name, highlights }),
  });

export const shipGifts = (player1, player2, pairing, giftMessage) =>
  fetchJson(`${API_BASE}/ship-gifts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player1, player2, pairing, giftMessage }),
  });
