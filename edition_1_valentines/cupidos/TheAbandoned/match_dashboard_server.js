import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// File lives in edition_1_valentines/cupidos/TheAbandoned; repo root is three levels up.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DATA_PATH = path.join(
  REPO_ROOT,
  "edition_1_valentines",
  "data",
  "cupid_matchmaking",
  "data",
  "dataset_cupid_matchmaking.csv"
);
const TELEMETRY_PATH = path.join(
  REPO_ROOT,
  "edition_1_valentines",
  "data",
  "love_notes_telemetry",
  "data",
  "dataset_love_notes_telemetry.csv"
);
const GIFT_PATH = path.join(REPO_ROOT, "edition_1_valentines", "data", "gifts", "data", "GiftRecommender.csv");
const DIM_CUSTOMER_PATH = path.join(
  REPO_ROOT,
  "edition_1_valentines",
  "data",
  "cupid_chocolate_global",
  "data",
  "DimCustomer.csv"
);

const TRAIT_COLS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

// Dealbreaker tokens we can operationalize with existing fields
const DB_RULES = {
  different_timezone: (self, other) => self.location_region === other.location_region,
  age_gap: (self, other) => Math.abs(self.age - other.age) <= 10,
};

const telemetryStats = loadTelemetry();
const giftEvents = loadGiftEvents();
const customerMap = loadCustomers();
const giftSalesSummary = buildGiftSalesSummary(giftEvents, customerMap);

// Anchor lat/lon for regions (approximate city centroids)
const REGION_COORDS = {
  "West US": { lat: 47.23, lon: -119.85 }, // Quincy, WA
  "East US": { lat: 36.68, lon: -78.38 }, // Boydton, VA
  "North Europe": { lat: 53.35, lon: -6.26 }, // Dublin
  "West Europe": { lat: 52.37, lon: 4.9 }, // Amsterdam
  "EU West": { lat: 52.37, lon: 4.9 }, // alias
  "UK South": { lat: 51.51, lon: -0.13 }, // London
  "Canada Central": { lat: 43.65, lon: -79.38 }, // Toronto
  "Brazil South": { lat: -23.55, lon: -46.63 }, // Sao Paulo
  "Japan East": { lat: 35.68, lon: 139.65 }, // Tokyo
  "Australia East": { lat: -33.87, lon: 151.21 }, // Sydney
};

function splitAndStrip(value) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeRegion(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function loadTelemetry() {
  if (!fs.existsSync(TELEMETRY_PATH)) return new Map();
  const csvText = fs.readFileSync(TELEMETRY_PATH, "utf8");
  const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  const stats = new Map();

  const statusWeight = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return 1;
    if (s === "retried") return 0.7;
    if (s === "pending") return 0.4;
    return 0; // failed or unknown
  };

  for (const row of records) {
    const origin = normalizeRegion(row.region_origin);
    const dest = normalizeRegion(row.region_destination);
    if (!origin || !dest) continue;
    const key = `${origin}->${dest}`;
    const entry = stats.get(key) || { count: 0, sumLatency: 0, sumRetries: 0, sumReliability: 0 };
    entry.count += 1;
    entry.sumLatency += Number(row.latency_ms) || 0;
    entry.sumRetries += Number(row.retry_count) || 0;
    entry.sumReliability += statusWeight(row.delivery_status);
    stats.set(key, entry);
  }

  return stats;
}

function loadGiftEvents() {
  if (!fs.existsSync(GIFT_PATH)) return [];
  const csvText = fs.readFileSync(GIFT_PATH, "utf8");
  return parse(csvText, { columns: true, skip_empty_lines: true, trim: true }).map((row) => ({
    event_type: row.event_type,
    customer_id: row.customer_id,
    country_iso2: row.country_iso2,
    loyalty_tier: row.loyalty_tier,
    product_sku: row.product_sku,
    product_name: row.product_name,
    product_category: row.product_category,
    product_subcategory: row.product_subcategory,
    unit_price: Number(row.unit_price) || 0,
    discount_pct: Number(row.discount_pct) || 0,
  }));
}

function loadCustomers() {
  if (!fs.existsSync(DIM_CUSTOMER_PATH)) return new Map();
  const csvText = fs.readFileSync(DIM_CUSTOMER_PATH, "utf8");
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  const map = new Map();
  for (const r of rows) {
    map.set(r.customer_id, {
      country_iso2: r.country_code,
      loyalty_tier: r.loyalty_tier,
    });
  }
  return map;
}

function buildGiftSalesSummary(events, customerMap) {
  const purchases = events.filter((e) => e.event_type === "purchase");
  const totalPurchases = purchases.length;
  let totalRevenue = 0;

  const productAgg = new Map();
  const countryAgg = new Map();
  const loyaltyAgg = new Map();

  for (const p of purchases) {
    totalRevenue += p.unit_price;
    const customer = customerMap.get(p.customer_id);
    const country = (customer?.country_iso2 || p.country_iso2 || "").toUpperCase();
    const loyalty = customer?.loyalty_tier || p.loyalty_tier || "Unknown";
    const key = p.product_sku || p.product_name;

    const prod = productAgg.get(key) || { sku: p.product_sku, name: p.product_name, category: p.product_category, subcategory: p.product_subcategory, count: 0, revenue: 0 };
    prod.count += 1;
    prod.revenue += p.unit_price;
    productAgg.set(key, prod);

    if (country) {
      const c = countryAgg.get(country) || { country, count: 0, revenue: 0 };
      c.count += 1;
      c.revenue += p.unit_price;
      countryAgg.set(country, c);
    }

    const l = loyaltyAgg.get(loyalty) || { loyalty, count: 0, revenue: 0 };
    l.count += 1;
    l.revenue += p.unit_price;
    loyaltyAgg.set(loyalty, l);
  }

  const toSortedArray = (m, by = "count") =>
    Array.from(m.values())
      .map((x) => ({ ...x, revenue: Number(x.revenue.toFixed(2)) }))
      .sort((a, b) => b[by] - a[by]);

  return {
    totalPurchases,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    topProducts: toSortedArray(productAgg, "count").slice(0, 8),
    topCountries: toSortedArray(countryAgg, "count").slice(0, 8),
    topLoyalty: toSortedArray(loyaltyAgg, "count").slice(0, 6),
  };
}

function loadData() {
  const csvText = fs.readFileSync(DATA_PATH, "utf8");
  const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  return records.map((row) => ({
    user_id: row.user_id,
    age: Number(row.age),
    location_region: row.location_region,
    interests_list: splitAndStrip(row.interests || ""),
    openness: Number(row.openness),
    conscientiousness: Number(row.conscientiousness),
    extraversion: Number(row.extraversion),
    agreeableness: Number(row.agreeableness),
    neuroticism: Number(row.neuroticism),
    matches_attempted: Number(row.matches_attempted),
    matches_success: Number(row.matches_success),
    sentiment_score: Number(row.sentiment_score),
    pref_age_min: Number(row.pref_age_min),
    pref_age_max: Number(row.pref_age_max),
    dealbreakers_list:
      !row.dealbreakers || row.dealbreakers === "no_dealbreakers"
        ? []
        : splitAndStrip(row.dealbreakers),
  }));
}

function jaccard(left, right) {
  const l = new Set(left);
  const r = new Set(right);
  if (!l.size && !r.size) return 0;
  const intersection = [...l].filter((x) => r.has(x)).length;
  const union = new Set([...l, ...r]).size;
  return intersection / union;
}

function haversineKm(a, b) {
  const R = 6371; // Earth radius km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function personalitySimilarity(a, b) {
  const diff = TRAIT_COLS.map((k) => a[k] - b[k]);
  const dist = Math.sqrt(diff.reduce((sum, v) => sum + v * v, 0));
  return Math.max(0, 1 - dist / Math.sqrt(TRAIT_COLS.length));
}

function sentimentAlignment(a, b) {
  return Math.max(0, 1 - Math.abs(a - b) / 2);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function regionBonus(a, b) {
  const na = normalizeRegion(a);
  const nb = normalizeRegion(b);
  const key1 = `${na}->${nb}`;
  const key2 = `${nb}->${na}`;
  const entries = [];
  if (telemetryStats.has(key1)) entries.push(telemetryStats.get(key1));
  if (telemetryStats.has(key2)) entries.push(telemetryStats.get(key2));

  if (entries.length) {
    const merged = entries.reduce(
      (acc, e) => {
        acc.count += e.count;
        acc.sumLatency += e.sumLatency;
        acc.sumRetries += e.sumRetries;
        acc.sumReliability += e.sumReliability;
        return acc;
      },
      { count: 0, sumLatency: 0, sumRetries: 0, sumReliability: 0 }
    );
    const avgLatency = merged.sumLatency / merged.count;
    const avgRetries = merged.sumRetries / merged.count;
    const avgReliability = merged.sumReliability / merged.count;

    const latencyScore = clamp01((250 - avgLatency) / 200); // 50ms ->1, 250ms ->0
    const retryScore = clamp01(1 - avgRetries / 3); // retries 0->1, 3+ ->0
    const reliabilityScore = clamp01(avgReliability); // already 0-1 weights

    const commScore = 0.5 * latencyScore + 0.2 * retryScore + 0.3 * reliabilityScore;
    return Number(commScore.toFixed(3));
  }

  // Fallback to distance tiers if no telemetry available
  if (a === b) return 1;
  const ca = REGION_COORDS[a];
  const cb = REGION_COORDS[b];
  if (ca && cb) {
    const d = haversineKm(ca, cb);
    if (d <= 800) return 0.9;
    if (d <= 2000) return 0.75;
    if (d <= 5000) return 0.5;
    return 0.2;
  }
  return 0.5;
}

function ageCompatible(a, b) {
  const aToB = b.age >= a.pref_age_min && b.age <= a.pref_age_max;
  const bToA = a.age >= b.pref_age_min && a.age <= b.pref_age_max;
  return aToB && bToA;
}

function respectsDealbreakers(a, b) {
  // Only apply rules we can evaluate with available fields.
  const checkList = (self, other) =>
    (self.dealbreakers_list || []).every((token) => {
      const rule = DB_RULES[token];
      return rule ? rule(self, other) : true;
    });

  return checkList(a, b) && checkList(b, a);
}

function scorePair(a, b) {
  const interests_score = jaccard(a.interests_list, b.interests_list);
  const personality_score = personalitySimilarity(a, b);
  const sentiment_score = sentimentAlignment(a.sentiment_score, b.sentiment_score);
  const location_score = regionBonus(a.location_region, b.location_region);
  const combined =
    0.35 * interests_score +
    0.3 * personality_score +
    0.15 * sentiment_score +
    0.2 * location_score; // Slightly higher weight for location

  return {
    match_for: a.user_id,
    candidate: b.user_id,
    score: Number(combined.toFixed(3)),
    interests_score: Number(interests_score.toFixed(3)),
    personality_score: Number(personality_score.toFixed(3)),
    sentiment_score: Number(sentiment_score.toFixed(3)),
    location_score: Number(location_score.toFixed(3)),
    age: b.age,
    region: b.location_region,
    interests: b.interests_list.join(", "),
  };
}

function buildMatches(data, { enforceAge, regions, minScore }) {
  const filtered = regions && regions.size ? data.filter((u) => regions.has(u.location_region)) : data;
  const scores = [];
  for (const a of filtered) {
    for (const b of filtered) {
      if (a.user_id === b.user_id) continue;
      if (enforceAge && !ageCompatible(a, b)) continue;
      if (!respectsDealbreakers(a, b)) continue;
      const pair = scorePair(a, b);
      if (pair.score >= minScore) scores.push({ ...pair, match_for_region: a.location_region });
    }
  }
  return scores.sort((x, y) => (x.match_for === y.match_for ? y.score - x.score : x.match_for.localeCompare(y.match_for)));
}

const data = loadData();
const userIds = data.map((u) => u.user_id).sort();
const regions = [...new Set(data.map((u) => u.location_region))].sort();
const topMatchesCache = new Map();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const AZURE_OAI_ENDPOINT = process.env.AZURE_OAI_ENDPOINT; // e.g., https://application3-ai.cognitiveservices.azure.com
const AZURE_OAI_DEPLOYMENT = process.env.AZURE_OAI_DEPLOYMENT || "gpt-4";
const AZURE_OAI_API_KEY = process.env.AZURE_OAI_API_KEY;

app.get("/api/users", (_req, res) => {
  res.json({ users: userIds, regions });
});

app.get("/api/matches", (req, res) => {
  const user = req.query.user || userIds[0];
  const minScore = 0.4;
  const enforceAge = true;
  const topK = 10;
  const regionSet = new Set();

  const userProfile = data.find((u) => u.user_id === user);
  if (!userProfile) {
    return res.status(404).json({ error: "User not found" });
  }

  const matches = buildMatches(data, { enforceAge, regions: regionSet, minScore }).filter(
    (m) => m.match_for === user
  );

  res.json({
    user,
    userProfile: {
      user_id: userProfile.user_id,
      age: userProfile.age,
      region: userProfile.location_region,
      interests: userProfile.interests_list,
      sentiment_score: userProfile.sentiment_score,
      openness: userProfile.openness,
      conscientiousness: userProfile.conscientiousness,
      extraversion: userProfile.extraversion,
      agreeableness: userProfile.agreeableness,
      neuroticism: userProfile.neuroticism,
      pref_age_min: userProfile.pref_age_min,
      pref_age_max: userProfile.pref_age_max,
      dealbreakers: userProfile.dealbreakers_list,
    },
    total: matches.length,
    matches: matches.slice(0, topK),
  });
});

app.get("/api/top-per-user", (req, res) => {
  const minScore = 0.4;
  const enforceAge = true;
  const regionSet = new Set();

  const allMatches = buildMatches(data, { enforceAge, regions: regionSet, minScore });
  const best = new Map();
  for (const m of allMatches) {
    const prev = best.get(m.match_for);
    if (!prev || m.score > prev.score) {
      best.set(m.match_for, m);
    }
  }

  const rows = userIds
    .map((uid) => best.get(uid))
    .filter(Boolean)
    .sort((a, b) => a.match_for.localeCompare(b.match_for));

  // Cache for downstream opening-line lookups keyed by match_for
  rows.forEach((r) => topMatchesCache.set(r.match_for, r));

  res.json({ total: rows.length, rows });
});

app.post("/api/opening-line", async (req, res) => {
  if (!AZURE_OAI_ENDPOINT || !AZURE_OAI_API_KEY) {
    return res.status(500).json({ error: "Azure OpenAI config missing. Set AZURE_OAI_ENDPOINT, AZURE_OAI_API_KEY, AZURE_OAI_DEPLOYMENT." });
  }

  const match = req.body?.match;
  if (!match || !match.match_for || !match.candidate) {
    return res.status(400).json({ error: "match payload with match_for and candidate is required" });
  }

  const interests = match.interests || "";
  const prompt = `You write flirty, cheeky 1-liner openers for dating. Max 28 words. Mention a shared interest if provided. Be witty, specific, and a touch daring, but stay respectful. If no interests, improvise a clever hook.`;
  const userContent = `Match for ${match.match_for} -> ${match.candidate}\nRegion: ${match.region || "?"}\nAge: ${match.age || "?"}\nShared interests: ${interests || "(none listed)"}`;

  try {
    const resp = await fetch(
      `${AZURE_OAI_ENDPOINT}/openai/deployments/${AZURE_OAI_DEPLOYMENT}/chat/completions?api-version=2024-05-01-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_OAI_API_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userContent },
          ],
          temperature: 1.05,
          max_tokens: 120,
        }),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: `Azure OpenAI error: ${resp.status} ${text}` });
    }

    const json = await resp.json();
    const line = json.choices?.[0]?.message?.content?.trim() || "(no line generated)";
    res.json({ line });
  } catch (err) {
    res.status(500).json({ error: err.message || "Opening line generation failed" });
  }
});

app.post("/api/gift-idea", async (req, res) => {
  if (!AZURE_OAI_ENDPOINT || !AZURE_OAI_API_KEY) {
    return res.status(500).json({ error: "Azure OpenAI config missing. Set AZURE_OAI_ENDPOINT, AZURE_OAI_API_KEY, AZURE_OAI_DEPLOYMENT." });
  }

  const match = req.body?.match;
  if (!match || !match.match_for || !match.candidate) {
    return res.status(400).json({ error: "match payload with match_for and candidate is required" });
  }

  const interests = match.interests || "";
  const prompt = `You are a playful gift stylist for modern dating. Suggest ONE concise gift idea (max 18 words) that feels thoughtful and tailored. Prefer affordable, shippable ideas. Use interests, region, and age if present. Avoid repeats; no cash, no gift cards.`;
  const userContent = `User ${match.match_for} (${match.match_for_region || "?"}) -> Candidate ${match.candidate} (${match.region || "?"}), age ${match.age || "?"}, shared interests: ${interests || "(none listed)"}`;

  try {
    const resp = await fetch(
      `${AZURE_OAI_ENDPOINT}/openai/deployments/${AZURE_OAI_DEPLOYMENT}/chat/completions?api-version=2024-05-01-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_OAI_API_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.9,
          max_tokens: 120,
        }),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: `Azure OpenAI error: ${resp.status} ${text}` });
    }

    const json = await resp.json();
    const gift = json.choices?.[0]?.message?.content?.trim() || "(no gift suggested)";
    res.json({ gift });
  } catch (err) {
    res.status(500).json({ error: err.message || "Gift suggestion failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  if (!AZURE_OAI_ENDPOINT || !AZURE_OAI_API_KEY) {
    return res.status(500).json({ error: "Azure OpenAI config missing. Set AZURE_OAI_ENDPOINT, AZURE_OAI_API_KEY, AZURE_OAI_DEPLOYMENT." });
  }

  const user = req.body?.user || userIds[0];
  const question = (req.body?.question || "").toString().trim();
  if (!question) return res.status(400).json({ error: "Question required" });

  const minScore = 0.4;
  const enforceAge = true;
  const regionSet = new Set();
  const userProfile = data.find((u) => u.user_id === user);
  if (!userProfile) return res.status(404).json({ error: "User not found" });

  const matches = buildMatches(data, { enforceAge, regions: regionSet, minScore })
    .filter((m) => m.match_for === user)
    .slice(0, 10);

  const systemPrompt = `You are a concise, friendly assistant for matchmaking results. Give clear, plain-language answers in 2-4 short sentences or bullets. Highlight the best candidates and the why in simple terms. Avoid over-precision; approximate is fine. Use only the provided data; if unsure, say you don't know.`;
  const contextLines = matches.map(
    (m, i) =>
      `${i + 1}. candidate=${m.candidate}, score=${m.score}, region=${m.region}, age=${m.age}, interests_score=${m.interests_score}, personality_score=${m.personality_score}, sentiment_score=${m.sentiment_score}, location_score=${m.location_score}`
  );
  const userContext = `User ${user} (age ${userProfile.age}, region ${userProfile.location_region})`; 

  try {
    const resp = await fetch(
      `${AZURE_OAI_ENDPOINT}/openai/deployments/${AZURE_OAI_DEPLOYMENT}/chat/completions?api-version=2024-05-01-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_OAI_API_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `User: ${userContext}\nTop matches:\n${contextLines.join("\n")}\n\nQuestion: ${question}` },
          ],
          temperature: 0.5,
          max_tokens: 350,
        }),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: `Azure OpenAI error: ${resp.status} ${text}` });
    }

    const json = await resp.json();
    const answer = json.choices?.[0]?.message?.content || "No answer";
    res.json({ answer, matches });
  } catch (err) {
    res.status(500).json({ error: err.message || "Chat call failed" });
  }
});

app.post("/api/chat-top", async (req, res) => {
  if (!AZURE_OAI_ENDPOINT || !AZURE_OAI_API_KEY) {
    return res.status(500).json({ error: "Azure OpenAI config missing. Set AZURE_OAI_ENDPOINT, AZURE_OAI_API_KEY, AZURE_OAI_DEPLOYMENT." });
  }

  const question = (req.body?.question || "").toString().trim();
  if (!question) return res.status(400).json({ error: "Question required" });

  const minScore = 0.4;
  const enforceAge = true;
  const regionSet = new Set();

  const allMatches = buildMatches(data, { enforceAge, regions: regionSet, minScore });
  const bestMap = new Map();
  for (const m of allMatches) {
    const prev = bestMap.get(m.match_for);
    if (!prev || m.score > prev.score) bestMap.set(m.match_for, m);
  }
  const rows = Array.from(bestMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  const systemPrompt = `You are a concise, friendly assistant for matchmaking results. Give clear, plain-language answers in 2-4 short sentences or bullets. Summarize insights across many users. Avoid over-precision; approximate is fine. Use only the provided data; if unsure, say you don't know.`;
  const contextLines = rows.map(
    (m, i) =>
      `${i + 1}. user=${m.match_for} (region ${m.match_for_region || "?"}) -> candidate=${m.candidate}, score=${m.score}, region=${m.region}, age=${m.age}`
  );

  try {
    const resp = await fetch(
      `${AZURE_OAI_ENDPOINT}/openai/deployments/${AZURE_OAI_DEPLOYMENT}/chat/completions?api-version=2024-05-01-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": AZURE_OAI_API_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Top matches snapshot (best per user):\n${contextLines.join("\n")}\n\nQuestion: ${question}` },
          ],
          temperature: 0.5,
          max_tokens: 350,
        }),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: `Azure OpenAI error: ${resp.status} ${text}` });
    }

    const json = await resp.json();
    const answer = json.choices?.[0]?.message?.content || "No answer";
    res.json({ answer, rows });
  } catch (err) {
    res.status(500).json({ error: err.message || "Chat call failed" });
  }
});

app.get("/api/region-comms", (_req, res) => {
  const rows = Array.from(telemetryStats.entries()).map(([key, v]) => {
    const [origin, dest] = key.split("->");
    const avgLatency = v.sumLatency / v.count;
    const avgRetries = v.sumRetries / v.count;
    const avgReliability = v.sumReliability / v.count;
    const latencyScore = clamp01((250 - avgLatency) / 200);
    const retryScore = clamp01(1 - avgRetries / 3);
    const reliabilityScore = clamp01(avgReliability);
    const commScore = Number((0.5 * latencyScore + 0.2 * retryScore + 0.3 * reliabilityScore).toFixed(3));

    return {
      origin,
      dest,
      avgLatency: Number(avgLatency.toFixed(1)),
      avgRetries: Number(avgRetries.toFixed(2)),
      avgReliability: Number(avgReliability.toFixed(2)),
      commScore,
      count: v.count,
    };
  });

  rows.sort((a, b) => b.commScore - a.commScore);
  res.json({ total: rows.length, rows });
});

app.get("/api/gift-sales", (_req, res) => {
  res.json(giftSalesSummary);
});

app.get("/", (_req, res) => {
  res.type("html").send(renderPage());
});

app.listen(PORT, () => {
  console.log(`Cupid dashboard running at http://localhost:${PORT}`);
});

function renderPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cupid Matchmaking Dashboard</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel: #0b1224;
      --card: #111a30;
      --muted: #cbd5e1;
      --text: #e2e8f0;
      --accent: #7c3aed;
      --accent-2: #22d3ee;
      --border: #1f2a44;
      --shadow: 0 10px 30px rgba(0,0,0,0.35);
      --radius: 10px;
    }
    * { box-sizing: border-box; }
    body { font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; margin: 0; padding: 1.5rem 2rem; background: radial-gradient(circle at 20% 20%, rgba(124,58,237,0.18), transparent 35%), radial-gradient(circle at 80% 0%, rgba(34,211,238,0.18), transparent 30%), var(--bg); color: var(--text); }
    header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    h1 { margin: 0; font-weight: 800; letter-spacing: 0.5px; }
    p { color: var(--muted); }
    label { display: flex; flex-direction: column; font-size: 0.9rem; gap: 0.35rem; color: var(--muted); }
    input, select { padding: 0.55rem 0.65rem; border-radius: 8px; border: 1px solid var(--border); background: #0d162c; color: var(--text); }
    .card { background: var(--card); border: 1px solid var(--border); padding: 0.9rem 1rem; border-radius: var(--radius); margin-top: 0.75rem; box-shadow: var(--shadow); }
    .layout { display:flex; gap:1rem; align-items:flex-start; }
    .sidebar { width: 220px; min-width: 200px; display:flex; flex-direction:column; gap:0.5rem; }
    .nav-bar { display:flex; flex-direction:column; gap:0.5rem; }
    .nav-bar button { padding:0.65rem 0.85rem; border:1px solid var(--border); background: #0d162c; color: var(--text); border-radius:8px; cursor:pointer; box-shadow: var(--shadow); text-align:left; }
    .nav-bar button.active { background: var(--accent); border-color: var(--accent); font-weight:700; color: #fff; }
    .nav-bar button:hover { border-color: var(--accent-2); }
    .main { flex:1; min-width:0; }
    .section { margin-top:0.75rem; }
    .hidden { display:none; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; background: #0d162c; border:1px solid var(--border); border-radius: var(--radius); overflow:hidden; box-shadow: var(--shadow); }
    th, td { padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--border); text-align: left; color: var(--text); }
    th { background: rgba(124,58,237,0.18); font-weight: 700; }
    tr:hover td { background: rgba(255,255,255,0.03); }
    button { color: var(--text); background: #0d162c; border:1px solid var(--border); border-radius:8px; padding:0.55rem 0.9rem; cursor:pointer; box-shadow: var(--shadow); }
    button:hover { border-color: var(--accent-2); }
    textarea { width: 100%; min-height: 90px; padding: 0.65rem; border-radius: 8px; border: 1px solid var(--border); background: #0d162c; color: var(--text); resize: vertical; }
    .chat-row { display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-start; }
    .chat-row button { white-space: nowrap; }
    .match-wrap { display:flex; gap:1rem; flex-wrap:wrap; align-items:flex-start; }
    .match-left { flex: 2; min-width: 380px; }
    .match-chat { flex: 1; min-width: 320px; background: linear-gradient(135deg, rgba(124,58,237,0.8), rgba(34,211,238,0.7)); border: none; color: #0b1224; box-shadow: 0 15px 40px rgba(0,0,0,0.35); }
    .match-chat strong, .match-chat p, .match-chat div, .match-chat button { color: #0b1224; }
    .match-chat textarea { background: rgba(255,255,255,0.1); color: #0b1224; border: 1px solid rgba(255,255,255,0.2); }
    .match-chat button { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #0b1224; font-weight: 700; }
    .match-chat button:hover { background: rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.45); }
    .match-chat .pill { display:inline-block; padding: 0.35rem 0.65rem; border-radius: 999px; background: rgba(255,255,255,0.18); color:#0b1224; margin-right:0.35rem; margin-bottom:0.35rem; font-weight:600; border:1px solid rgba(255,255,255,0.25); cursor:pointer; }
    .match-chat .pill:hover { background: rgba(255,255,255,0.3); }
    .side-panel { flex: 1; min-width: 320px; max-width: 440px; position: sticky; top: 110px; align-self: flex-start; }
    .hero-row { display:flex; gap:1rem; align-items:stretch; margin-top:0.5rem; flex-wrap:wrap; }
    .hero-left { flex:2; min-width: 520px; }
    .hero-right { flex:1; min-width: 320px; max-width: 440px; background: linear-gradient(135deg, rgba(124,58,237,0.9), rgba(34,211,238,0.9)); color:#0b1224; border:none; box-shadow: 0 18px 40px rgba(0,0,0,0.35); }
    #copilotHero .pill { background: rgba(255,255,255,0.2); color:#0b1224; border:1px solid rgba(255,255,255,0.3); }
    #copilotHero textarea { background: rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); color:#0b1224; }
    #copilotHero button { background: rgba(255,255,255,0.25); border:1px solid rgba(255,255,255,0.35); color:#0b1224; font-weight:700; }
    .quick-actions { display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.5rem; }
    .quick-btn { background: rgba(255,255,255,0.16); border:1px solid rgba(255,255,255,0.25); color:#0b1224; font-weight:700; box-shadow:none; padding:0.45rem 0.75rem; }
    .quick-btn:hover { background: rgba(255,255,255,0.28); }
    .mini-btn { display:inline-block; margin-top:0.25rem; padding:0.35rem 0.6rem; border-radius:8px; border:1px solid var(--border); background:#0d162c; color:var(--text); cursor:pointer; font-size:0.85rem; }
    .mini-btn:hover { border-color: var(--accent-2); }
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:none; align-items:center; justify-content:center; z-index:50; }
    .modal { background:#0b1224; border:1px solid var(--border); border-radius:12px; padding:1rem; width:min(520px, 90vw); box-shadow:0 18px 60px rgba(0,0,0,0.45); color:var(--text); }
    .modal header { display:flex; justify-content:space-between; align-items:center; }
    .modal h3 { margin:0; }
    .modal-close { border:none; background:transparent; color:var(--text); font-size:1.2rem; cursor:pointer; }
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:0.5rem; margin-top:0.5rem; }
    .stat-card { background:#0d162c; border:1px solid var(--border); padding:0.5rem 0.7rem; border-radius:8px; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
</head>
<body>
  <header>
    <div>
      <h1>💘 Cupid's Love-as-a-Service</h1>
      <p>Customized cuties delivered on demand — adjust your filters and let Cupid cook.</p>
    </div>
  </header>

  <div class="hero-row">
    <div class="card hero-left" id="explanation">
      <strong>Cupid's Secret Sauce</strong>
      <p>We look for overlap in interests, closeness in personality, similar sentiment, and how near the regions are (by approximate city anchors). Age fit can be required both ways. Dealbreakers remove pairs that violate the specific rules we can evaluate.</p>
      <ul>
        <li>Interests: more shared interests raises the score; no overlap lowers it.</li>
        <li>Personality: we compare five traits (O-C-E-A-N); closer profiles score higher.</li>
        <li>Sentiment: similar sentiment scores add alignment; big gaps reduce it.</li>
        <li>Region/proximity: driven by messaging telemetry (latency/retries/reliability) between regions; falls back to distance tiers if no data.</li>
        <li>Age fit: when enabled, both people must be inside each other’s preferred age range.</li>
        <li>Dealbreakers: enforced where data allows (e.g., “different_timezone” blocks cross-region, “age_gap” blocks >10-year gaps). Applied before scoring.</li>
      </ul>
      <p>Weights: 35% interests, 30% personality, 15% sentiment, 20% region/proximity (telemetry-first). Use the sidebar to change minimum score, age rule, and region filtering.</p>
    </div>
    <div class="card hero-right" id="copilotHero">
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <div style="font-size:1.2rem;">🤖</div>
        <div>
          <strong>Cupid Copilot</strong>
          <div style="color:var(--muted);">Top trends + selected user</div>
        </div>
      </div>

      <div style="margin-top:0.6rem; display:flex; gap:0.4rem; flex-wrap:wrap;">
        <span class="pill" data-prompt-hero="Which users have the strongest matches?">Strongest</span>
        <span class="pill" data-prompt-hero="Any regions standing out for good matches?">Regions</span>
        <span class="pill" data-prompt-hero="Summarize the top 5 pairings in simple terms.">Top 5 summary</span>
      </div>
      <div class="chat-row" style="margin-top:0.5rem;">
        <textarea id="heroTopQuestion" placeholder="Ask about top matches">Which users have the strongest matches?</textarea>
        <button id="heroTopSend">Ask</button>
      </div>
      <div id="heroTopAnswer" style="margin-top:0.5rem; font-weight:600;"></div>

      <div style="margin-top:0.85rem; padding-top:0.75rem; border-top:1px solid rgba(255,255,255,0.25);">
        <div style="display:flex;align-items:center;gap:0.5rem; margin-bottom:0.35rem;">
          <div style="font-weight:700;">For selected user</div>
          <div style="color:#0b1224;opacity:0.8; font-size:0.9rem;">Use the filters and ask targeted questions.</div>
        </div>
        <div style="margin-top:0.35rem; display:flex; gap:0.4rem; flex-wrap:wrap;">
          <span class="pill" data-prompt="Which candidate is the best fit and why?">Best fit</span>
          <span class="pill" data-prompt="Explain the top 3 matches in simple terms">Top 3 summary</span>
          <span class="pill" data-prompt="Any red flags or dealbreakers I should know?">Red flags</span>
        </div>
        <div class="quick-actions">
          <button class="quick-btn" data-prompt="Draft a friendly opener for the best match.">💌 Draft opener</button>
          <button class="quick-btn" data-prompt="Suggest two conversation topics based on shared interests.">💬 Topics</button>
          <button class="quick-btn" data-prompt="Give a 2-sentence rationale for the top match.">🔍 Why this match</button>
          <button class="quick-btn" data-prompt="Any long-distance caution or timing risk?">⏱️ Distance risk</button>
        </div>
        <div class="chat-row" style="margin-top:0.5rem;">
          <textarea id="chatQuestion" placeholder="Ask a question about this user's matches...">Which candidate is the best fit and why?</textarea>
          <button id="chatSend">Ask</button>
        </div>
        <div id="chatAnswer" style="margin-top:0.5rem; color: #0b1224; font-weight:600;"></div>
      </div>
    </div>
  </div>

  <div class="layout">
    <div class="sidebar">
      <div class="nav-bar">
        <button id="navMatches" class="active" data-target="matchSection">Spark-O-Meter</button>
        <button id="navTop" data-target="topSection">Hottest Sparks per User</button>
        <button id="navComms" data-target="regionSection">Cupid's Regional Love Signals</button>
        <button id="navSales" data-target="salesSection">Valentine sales</button>
      </div>
    </div>

    <div class="main">
      <div id="matchSection" class="section">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <div style="min-width:200px;">
            <label>User
              <select id="user"></select>
            </label>
          </div>
          <button id="refresh">Refresh</button>
        </div>
        <div class="match-wrap">
          <div class="match-left">
            <div id="summary"></div>
            <div id="userProfile" class="card"></div>
            <table id="table">
              <thead>
                <tr>
                  <th>Candidate</th><th>Score</th><th>Interests</th><th>Personality</th><th>Sentiment</th><th>Location</th><th>Age</th><th>Region</th><th>Interests</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="topSection" class="section hidden">
        <div class="card" id="topOverview">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <strong>Hottest Sparks per User</strong>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <button id="refreshTop">Refresh overview</button>
              <button id="generateAllOpeners">Generate all openers</button>
              <button id="generateAllGifts">Generate all gifts</button>
            </div>
          </div>
          <div id="topSummary" style="margin-top:0.25rem;"></div>
          <div class="match-wrap">
            <div class="match-left">
              <table style="width:100%;border-collapse:collapse;margin-top:0.5rem;">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>User Region</th>
                    <th>Top Candidate</th>
                    <th>Score</th>
                    <th>Age</th>
                    <th>Region</th>
                    <th>First Flirt</th>
                    <th>Cupid’s Gift Pick</th>
                  </tr>
                </thead>
                <tbody id="topTable"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div id="regionSection" class="section hidden">
        <div class="card" id="regionCard">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <strong>Region communication overview</strong>
            <button id="refreshComms">Refresh</button>
          </div>
          <div id="commsSummary" style="margin-top:0.25rem;"></div>
          <table style="width:100%;border-collapse:collapse;margin-top:0.5rem;">
            <thead>
              <tr>
                <th>Origin</th><th>Destination</th><th>Comm score</th><th>Avg latency (ms)</th><th>Avg retries</th><th>Reliability</th><th>Samples</th>
              </tr>
            </thead>
            <tbody id="commsTable"></tbody>
          </table>
          <div class="match-wrap" style="margin-top:0.75rem;">
            <div class="match-left">
              <strong>Top communication corridors</strong>
              <canvas id="commsScoreChart" height="220" style="margin-top:0.4rem;"></canvas>
            </div>
            <div class="match-left">
              <strong>Latency vs reliability</strong>
              <canvas id="commsLatencyChart" height="220" style="margin-top:0.4rem;"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div id="salesSection" class="section hidden">
        <div class="card" id="salesCard">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <strong>Valentine sales pulse (GiftRecommender purchases)</strong>
            <button id="refreshSales">Refresh</button>
          </div>
          <div id="salesSummary" style="margin-top:0.4rem;"></div>
          <div class="stat-grid" style="margin-top:0.5rem;">
            <div class="stat-card" id="salesTotal"></div>
            <div class="stat-card" id="salesRevenue"></div>
          </div>
          <div class="match-wrap" style="margin-top:0.5rem;">
            <div class="match-left">
              <strong>Top products</strong>
              <table style="width:100%;border-collapse:collapse;margin-top:0.3rem;">
                <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Count</th><th>Revenue</th></tr></thead>
                <tbody id="salesProducts"></tbody>
              </table>
              <canvas id="salesProductsChart" height="220" style="margin-top:0.5rem;"></canvas>
            </div>
            <div class="match-left">
              <strong>Top regions & loyalty</strong>
              <table style="width:100%;border-collapse:collapse;margin-top:0.3rem;">
                <thead><tr><th>Country</th><th>Purchases</th><th>Revenue</th></tr></thead>
                <tbody id="salesCountries"></tbody>
              </table>
              <table style="width:100%;border-collapse:collapse;margin-top:0.3rem;">
                <thead><tr><th>Loyalty</th><th>Purchases</th><th>Revenue</th></tr></thead>
                <tbody id="salesLoyalty"></tbody>
              </table>
              <canvas id="salesCountriesChart" height="220" style="margin-top:0.5rem;"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="modalOverlay">
    <div class="modal" role="dialog" aria-modal="true">
      <header>
        <h3 id="modalTitle">Match details</h3>
        <button class="modal-close" id="modalClose">&times;</button>
      </header>
      <div id="modalBody"></div>
    </div>
  </div>

<script>
let currentMatches = [];
let salesProductsChart;
let salesCountriesChart;
let commsScoreChart;
let commsLatencyChart;
let currentTopRows = [];

async function loadUsers() {
  const res = await fetch('/api/users');
  const { users } = await res.json();
  const sel = document.getElementById('user');
  sel.innerHTML = users.map((u) => '<option value="' + u + '">' + u + '</option>').join('');
}

async function loadMatches() {
  const user = document.getElementById('user').value;
  const params = new URLSearchParams({ user });
  const res = await fetch('/api/matches?' + params.toString());
  const data = await res.json();
  currentMatches = data.matches || [];
  renderTable(data);
}

function renderTable({ user, userProfile, matches, total }) {
  document.getElementById('summary').textContent =
    'Showing ' + matches.length + ' of ' + total + ' matches for ' + user + '.';
  renderUserProfile(userProfile);
  const tbody = document.querySelector('#table tbody');
  tbody.innerHTML = matches
    .map(
      (m, idx) =>
        '<tr data-row="' + idx + '">' +
        '<td>' + m.candidate + '</td>' +
        '<td>' + m.score + '</td>' +
        '<td>' + m.interests_score + '</td>' +
        '<td>' + m.personality_score + '</td>' +
        '<td>' + m.sentiment_score + '</td>' +
        '<td>' + m.location_score + '</td>' +
        '<td>' + m.age + '</td>' +
        '<td>' + m.region + '</td>' +
        '<td>' + m.interests + '</td>' +
        '</tr>'
    )
    .join('');
  attachRowClicks();
}

function renderUserProfile(profile) {
  if (!profile) return;
  const wrap = document.getElementById('userProfile');
  wrap.innerHTML =
    '<strong>User profile</strong><br/>' +
    'Age: ' + profile.age + ' | Region: ' + profile.region + '<br/>' +
    'Interests: ' + (profile.interests.join(', ') || 'N/A') + '<br/>' +
    'Traits (OCEA-N): ' +
    profile.openness + ', ' +
    profile.conscientiousness + ', ' +
    profile.extraversion + ', ' +
    profile.agreeableness + ', ' +
    profile.neuroticism + '<br/>' +
    'Sentiment: ' + profile.sentiment_score + '<br/>' +
    'Pref age: ' + profile.pref_age_min + ' - ' + profile.pref_age_max + '<br/>' +
    'Dealbreakers: ' + (profile.dealbreakers.length ? profile.dealbreakers.join(', ') : 'None');
}

async function loadTopOverview() {
  const res = await fetch('/api/top-per-user');
  const data = await res.json();
  renderTopOverview(data);
}

function renderTopOverview({ total, rows }) {
  const summary = document.getElementById('topSummary');
  summary.textContent = 'Top matches found for ' + total + ' users (after filters).';
  currentTopRows = rows || [];
  const tbody = document.getElementById('topTable');
  tbody.innerHTML = rows
    .map(
      (m, idx) =>
        '<tr>' +
        '<td>' + m.match_for + '</td>' +
        '<td>' + (m.match_for_region || '') + '</td>' +
        '<td>' + m.candidate + '</td>' +
        '<td>' + m.score + '</td>' +
        '<td>' + m.age + '</td>' +
        '<td>' + m.region + '</td>' +
        '<td>' +
          '<button class="mini-btn" data-opener-btn="' + idx + '">Generate opener</button>' +
          '<div class="opener-text" data-opener-idx="' + idx + '" style="font-size:0.9rem; color:#e2e8f0; margin-top:0.3rem;"></div>' +
        '</td>' +
        '<td>' +
          '<div class="gift-text" data-gift-idx="' + idx + '" style="font-size:0.9rem; color:#e2e8f0; margin-top:0.3rem;"></div>' +
        '</td>' +
        '</tr>'
    )
    .join('');

  bindTopRowButtons();
}

async function init() {
  await loadUsers();
  await loadMatches();
  await loadTopOverview();
}

init();
document.getElementById('refresh').addEventListener('click', loadMatches);
document.getElementById('user').addEventListener('change', loadMatches);
document.getElementById('refreshTop').addEventListener('click', loadTopOverview);
document.getElementById('generateAllOpeners').addEventListener('click', generateAllOpeners);
document.getElementById('generateAllGifts').addEventListener('click', generateAllGifts);
document.getElementById('chatSend').addEventListener('click', sendChat);
document.getElementById('refreshComms').addEventListener('click', loadRegionComms);
document.getElementById('refreshSales').addEventListener('click', loadGiftSales);
const heroSend = document.getElementById('heroTopSend');
if (heroSend) heroSend.addEventListener('click', sendChatTopHero);
const chatTopSend = document.getElementById('chatTopSend');
if (chatTopSend) chatTopSend.addEventListener('click', sendChatTop);
function bindQuickPrompts(root = document) {
  root.querySelectorAll('.pill').forEach((p) => {
    if (p.dataset.bound) return;
    p.dataset.bound = '1';
    p.addEventListener('click', () => {
      const prompt = p.getAttribute('data-prompt');
      if (prompt) {
        document.getElementById('chatQuestion').value = prompt;
      }
    });
  });

  root.querySelectorAll('.quick-btn').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => {
      const prompt = b.getAttribute('data-prompt');
      if (prompt) {
        document.getElementById('chatQuestion').value = prompt;
        document.getElementById('chatSend').click();
      }
    });
  });
}

bindQuickPrompts();
document.querySelectorAll('[data-prompt-top]').forEach((p) => {
  const target = document.getElementById('chatTopQuestion');
  if (!target) return;
  p.addEventListener('click', () => {
    const prompt = p.getAttribute('data-prompt-top');
    if (prompt) {
      target.value = prompt;
    }
  });
});
document.querySelectorAll('[data-prompt-hero]').forEach((p) => {
  const target = document.getElementById('heroTopQuestion');
  if (!target) return;
  p.addEventListener('click', () => {
    const prompt = p.getAttribute('data-prompt-hero');
    if (prompt) {
      target.value = prompt;
    }
  });
});

async function sendChat() {
  const user = document.getElementById('user').value;
  const question = document.getElementById('chatQuestion').value.trim();
  const answerBox = document.getElementById('chatAnswer');
  if (!question) {
    answerBox.textContent = 'Please enter a question.';
    return;
  }
  answerBox.textContent = 'Thinking...';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, question }),
    });
    const data = await res.json();
    if (!res.ok) {
      answerBox.textContent = data.error || 'Chat failed.';
      return;
    }
    answerBox.textContent = data.answer;
  } catch (err) {
    answerBox.textContent = 'Error: ' + (err.message || 'Chat failed');
  }
}

async function loadRegionComms() {
  const res = await fetch('/api/region-comms');
  const data = await res.json();
  renderRegionComms(data);
}

function renderRegionComms({ total, rows }) {
  const summary = document.getElementById('commsSummary');
  summary.textContent = 'Pairs with telemetry: ' + total + '. Higher comm score means better messaging between regions.';
  const tbody = document.getElementById('commsTable');
  tbody.innerHTML = rows
    .map(
      (r) =>
        '<tr>' +
        '<td>' + r.origin + '</td>' +
        '<td>' + r.dest + '</td>' +
        '<td>' + r.commScore + '</td>' +
        '<td>' + r.avgLatency + '</td>' +
        '<td>' + r.avgRetries + '</td>' +
        '<td>' + r.avgReliability + '</td>' +
        '<td>' + r.count + '</td>' +
        '</tr>'
    )
    .join('');

  const labels = rows.slice(0, 15).map((r) => r.origin + ' → ' + r.dest);
  const scores = rows.slice(0, 15).map((r) => r.commScore);
  const latencies = rows.slice(0, 50).map((r) => r.avgLatency);
  const reliabilities = rows.slice(0, 50).map((r) => r.avgReliability);
  const scatterData = rows.slice(0, 50).map((r) => ({
    x: r.avgLatency,
    y: r.avgReliability,
    label: r.origin + ' → ' + r.dest,
  }));

  const scoreCtx = document.getElementById('commsScoreChart');
  if (scoreCtx) {
    if (commsScoreChart) commsScoreChart.destroy();
    commsScoreChart = new Chart(scoreCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Comm score',
            data: scores,
            backgroundColor: 'rgba(124,58,237,0.6)',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: '#cbd5e1' } },
          y: { ticks: { color: '#cbd5e1' }, suggestedMax: 1 },
        },
        plugins: {
          legend: { labels: { color: '#cbd5e1' } },
          tooltip: {
            callbacks: {
              label: (ctx) => 'Comm score: ' + ctx.parsed.y,
            },
          },
        },
      },
    });
  }

  const latencyCtx = document.getElementById('commsLatencyChart');
  if (latencyCtx) {
    if (commsLatencyChart) commsLatencyChart.destroy();
    commsLatencyChart = new Chart(latencyCtx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Latency vs reliability',
            data: scatterData,
            backgroundColor: 'rgba(34,211,238,0.7)',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Avg latency (ms)', color: '#cbd5e1' }, ticks: { color: '#cbd5e1' } },
          y: { title: { display: true, text: 'Reliability', color: '#cbd5e1' }, ticks: { color: '#cbd5e1' }, suggestedMin: 0, suggestedMax: 1 },
        },
        plugins: {
          legend: { labels: { color: '#cbd5e1' } },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.raw.label + ': ' + ctx.raw.x + ' ms, rel ' + ctx.raw.y,
            },
          },
        },
      },
    });
  }
}

async function loadGiftSales() {
  const res = await fetch('/api/gift-sales');
  const data = await res.json();
  renderGiftSales(data);
}

function renderGiftSales({ totalPurchases, totalRevenue, topProducts, topCountries, topLoyalty }) {
  document.getElementById('salesSummary').textContent = 'Purchase events: ' + totalPurchases + ' | Revenue (unit_price sum): ' + totalRevenue.toFixed(2);
  document.getElementById('salesTotal').innerHTML = '<strong>Purchases</strong><br>' + totalPurchases;
  document.getElementById('salesRevenue').innerHTML = '<strong>Revenue</strong><br>' + totalRevenue.toFixed(2);

  const prodBody = document.getElementById('salesProducts');
  prodBody.innerHTML = (topProducts || [])
    .map((p) =>
      '<tr>' +
      '<td>' + (p.sku || '') + '</td>' +
      '<td>' + (p.name || '') + '</td>' +
      '<td>' + [p.category, p.subcategory].filter(Boolean).join(' / ') + '</td>' +
      '<td>' + p.count + '</td>' +
      '<td>' + p.revenue.toFixed(2) + '</td>' +
      '</tr>'
    )
    .join('');

  const countryBody = document.getElementById('salesCountries');
  countryBody.innerHTML = (topCountries || [])
    .map((c) =>
      '<tr>' +
      '<td>' + c.country + '</td>' +
      '<td>' + c.count + '</td>' +
      '<td>' + c.revenue.toFixed(2) + '</td>' +
      '</tr>'
    )
    .join('');

  const loyaltyBody = document.getElementById('salesLoyalty');
  loyaltyBody.innerHTML = (topLoyalty || [])
    .map((l) =>
      '<tr>' +
      '<td>' + l.loyalty + '</td>' +
      '<td>' + l.count + '</td>' +
      '<td>' + l.revenue.toFixed(2) + '</td>' +
      '</tr>'
    )
    .join('');

  const prodLabels = (topProducts || []).map((p) => p.name || p.sku || '');
  const prodCounts = (topProducts || []).map((p) => p.count);
  const prodRevenue = (topProducts || []).map((p) => p.revenue);
  const countryLabels = (topCountries || []).map((c) => c.country);
  const countryCounts = (topCountries || []).map((c) => c.count);

  const productCtx = document.getElementById('salesProductsChart');
  if (productCtx) {
    if (salesProductsChart) salesProductsChart.destroy();
    salesProductsChart = new Chart(productCtx, {
      type: 'bar',
      data: {
        labels: prodLabels,
        datasets: [
          { label: 'Purchases', data: prodCounts, backgroundColor: 'rgba(124,58,237,0.6)' },
          { label: 'Revenue', data: prodRevenue, backgroundColor: 'rgba(34,211,238,0.5)' },
        ],
      },
      options: { responsive: true, scales: { x: { ticks: { color: '#cbd5e1' } }, y: { ticks: { color: '#cbd5e1' } } }, plugins: { legend: { labels: { color: '#cbd5e1' } } } },
    });
  }

  const countryCtx = document.getElementById('salesCountriesChart');
  if (countryCtx) {
    if (salesCountriesChart) salesCountriesChart.destroy();
    salesCountriesChart = new Chart(countryCtx, {
      type: 'bar',
      data: {
        labels: countryLabels,
        datasets: [
          { label: 'Purchases', data: countryCounts, backgroundColor: 'rgba(34,211,238,0.7)' },
        ],
      },
      options: { indexAxis: 'y', responsive: true, scales: { x: { ticks: { color: '#cbd5e1' } }, y: { ticks: { color: '#cbd5e1' } } }, plugins: { legend: { labels: { color: '#cbd5e1' } } } },
    });
  }
}

async function sendChatTop() {
  const question = document.getElementById('chatTopQuestion').value.trim();
  const answerBox = document.getElementById('chatTopAnswer');
  if (!question) {
    answerBox.textContent = 'Please enter a question.';
    return;
  }
  answerBox.textContent = 'Thinking...';
  try {
    const res = await fetch('/api/chat-top', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    if (!res.ok) {
      answerBox.textContent = data.error || 'Chat failed.';
      return;
    }
    answerBox.textContent = data.answer;
  } catch (err) {
    answerBox.textContent = 'Error: ' + (err.message || 'Chat failed');
  }
}

async function sendChatTopHero() {
  const input = document.getElementById('heroTopQuestion');
  const answerBox = document.getElementById('heroTopAnswer');
  if (!input || !answerBox) return;
  const question = input.value.trim();
  if (!question) {
    answerBox.textContent = 'Please enter a question.';
    return;
  }
  answerBox.textContent = 'Thinking...';
  try {
    const res = await fetch('/api/chat-top', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    if (!res.ok) {
      answerBox.textContent = data.error || 'Chat failed.';
      return;
    }
    answerBox.textContent = data.answer;
  } catch (err) {
    answerBox.textContent = 'Error: ' + (err.message || 'Chat failed');
  }
}

async function requestTopOpener(idx) {
  const match = currentTopRows[idx];
  const slot = document.querySelector('[data-opener-idx="' + idx + '"]');
  if (!slot) return;
  if (!match) {
    slot.textContent = 'No match found.';
    return;
  }
  slot.textContent = 'Generating opener...';
  try {
    const res = await fetch('/api/opening-line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match }),
    });
    const data = await res.json();
    if (!res.ok) {
      slot.textContent = data.error || 'Failed to generate opener.';
      return;
    }
    slot.textContent = data.line;
  } catch (err) {
    slot.textContent = 'Error: ' + (err.message || 'Failed to generate opener');
  }
}

async function requestTopGift(idx) {
  const match = currentTopRows[idx];
  const slot = document.querySelector('[data-gift-idx="' + idx + '"]');
  if (!slot) return;
  if (!match) {
    slot.textContent = 'No match found.';
    return;
  }
  slot.textContent = 'Picking a gift...';
  try {
    const res = await fetch('/api/gift-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match }),
    });
    const data = await res.json();
    if (!res.ok) {
      slot.textContent = data.error || 'Failed to suggest a gift.';
      return;
    }
    slot.textContent = data.gift;
  } catch (err) {
    slot.textContent = 'Error: ' + (err.message || 'Failed to suggest a gift');
  }
}

async function generateAllOpeners() {
  if (!currentTopRows || !currentTopRows.length) return;
  const tasks = currentTopRows.map((_, i) => requestTopOpener(i));
  await Promise.all(tasks);
}

async function generateAllGifts() {
  if (!currentTopRows || !currentTopRows.length) return;
  const tasks = currentTopRows.map((_, i) => requestTopGift(i));
  await Promise.all(tasks);
}

function bindTopRowButtons() {
  document.querySelectorAll('[data-opener-btn]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-opener-btn'));
      requestTopOpener(idx);
    });
  });
}

function setSection(targetId) {
  const sections = ["matchSection", "topSection", "regionSection", "salesSection"];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === targetId) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  const buttons = ["navMatches", "navTop", "navComms", "navSales"];
  buttons.forEach((btnId) => {
    const b = document.getElementById(btnId);
    if (!b) return;
    const target = b.getAttribute('data-target');
    if (target === targetId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  const userControl = document.getElementById('userControl');
  if (userControl) {
    if (targetId === 'matchSection') {
      userControl.style.display = '';
    } else {
      userControl.style.display = 'none';
    }
  }

  if (targetId === 'topSection') {
    loadTopOverview();
  }
  if (targetId === 'regionSection') {
    loadRegionComms();
  }
  if (targetId === 'salesSection') {
    loadGiftSales();
  }
}

function attachRowClicks() {
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  const title = document.getElementById('modalTitle');
  document.querySelectorAll('#table tbody tr').forEach((row) => {
    row.addEventListener('click', () => {
      const idx = Number(row.getAttribute('data-row'));
      const m = currentMatches[idx];
      if (!m) return;
      title.textContent = 'Match: ' + m.candidate;
      body.innerHTML = \`
        <div class="stat-grid">
          <div class="stat-card"><strong>Score</strong><br>\${m.score}</div>
          <div class="stat-card"><strong>Interests</strong><br>\${m.interests_score}</div>
          <div class="stat-card"><strong>Personality</strong><br>\${m.personality_score}</div>
          <div class="stat-card"><strong>Sentiment</strong><br>\${m.sentiment_score}</div>
          <div class="stat-card"><strong>Location</strong><br>\${m.location_score}</div>
          <div class="stat-card"><strong>Age</strong><br>\${m.age}</div>
          <div class="stat-card"><strong>Region</strong><br>\${m.region}</div>
        </div>
        <p style="margin-top:0.75rem;">Shared interests: \${m.interests || 'None listed'}</p>
        <div class="quick-actions" style="margin-top:0.5rem;">
          <button class="quick-btn" data-prompt="Draft a friendly opener mentioning \${(m.interests || '').split(',')[0] || 'a shared interest'} for \${m.candidate}.">Use this match</button>
          <button class="quick-btn" data-prompt="Summarize why \${m.candidate} is a strong match and any cautionary notes.">Explain fit</button>
        </div>
      \`;
      bindQuickPrompts(body);
      overlay.style.display = 'flex';
    });
  });
  document.getElementById('modalClose').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
}

document.getElementById('navMatches').addEventListener('click', () => setSection('matchSection'));
document.getElementById('navTop').addEventListener('click', () => setSection('topSection'));
document.getElementById('navComms').addEventListener('click', () => setSection('regionSection'));
document.getElementById('navSales').addEventListener('click', () => setSection('salesSection'));
</script>
</body>
</html>`;
}
