import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getGiftRecommendation } from "../services/api";
import { MarkdownComponents } from "./shared/MarkdownRenderers";

export default function GiftRecommender({ player1, player2, onComplete }) {
  const [recommendations, setRecommendations] = useState({ player1: null, player2: null });
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState("20");
  const [error, setError] = useState(null);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const p1Profile = `${player1.name} who likes ${player1.interests.join(", ")} and has a ${player1.vibe} vibe, prefers ${player1.chocolatePreference}`;
      const p2Profile = `${player2.name} who likes ${player2.interests.join(", ")} and has a ${player2.vibe} vibe, prefers ${player2.chocolatePreference}`;

      const [result1, result2] = await Promise.all([
        getGiftRecommendation(p1Profile, budget, "Valentine's Day"),
        getGiftRecommendation(p2Profile, budget, "Valentine's Day"),
      ]);

      setRecommendations({
        player1: result1.recommendation,
        player2: result2.recommendation,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasRecommendations = recommendations.player1 && recommendations.player2;

  return (
    <div className="gift-screen">
      <div className="phase-header">
        <span className="phase-emoji">🎁</span>
        <h2>Perfect Gifts for Both</h2>
        <p className="phase-sub">Personalized chocolate gifts for {player1.name} & {player2.name}</p>
      </div>

      {!hasRecommendations && !loading && (
        <div className="gift-form">
          <div className="form-group">
            <label>Budget per gift (€):</label>
            <div className="chip-grid">
              {["10", "20", "50", "100", "no limit"].map((b) => (
                <button
                  key={b}
                  className={`chip ${budget === b ? "chip-active" : ""}`}
                  onClick={() => setBudget(b)}
                >
                  {b === "no limit" ? "💎 No limit" : `€${b}`}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary btn-lg" onClick={loadRecommendations}>
            Find Perfect Gifts for Both 🎁
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="chocolate-spinner">🎁</div>
          <p>Our AI sommelier is selecting the finest chocolates for both of you...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>😅 {error}</p>
          <button className="btn-secondary" onClick={loadRecommendations}>
            Try Again
          </button>
        </div>
      )}

      {hasRecommendations && (
        <div className="gift-results-dual">
          <div className="gift-card">
            <h3 className="gift-card-header">🎁 Gift for {player1.name}</h3>
            <div className="ai-response markdown-content">
              <ReactMarkdown components={MarkdownComponents}>
                {recommendations.player1}
              </ReactMarkdown>
            </div>
          </div>

          <div className="gift-card">
            <h3 className="gift-card-header">🎁 Gift for {player2.name}</h3>
            <div className="ai-response markdown-content">
              <ReactMarkdown components={MarkdownComponents}>
                {recommendations.player2}
              </ReactMarkdown>
            </div>
          </div>

          <div className="gift-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setRecommendations({ player1: null, player2: null });
                setError(null);
              }}
            >
              🔄 Different Budget
            </button>
            <button className="btn-primary" onClick={onComplete}>
              Create Memory Card 📸
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
