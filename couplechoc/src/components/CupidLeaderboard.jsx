import { useState, useEffect } from "react";
import { getTopCouples } from "../services/api";
import { useAiProvider } from "../hooks/useAiProvider";

const VIBE_EMOJI = {
  adventurous: "🎉",
  creative: "🎨",
  cozy: "☕",
};

export default function CupidLeaderboard({ onSelect }) {
  const { ai } = useAiProvider();
  const [couples, setCouples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    getTopCouples(20)
      .then((data) => {
        setCouples(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSelect = async (couple, idx) => {
    setSelectedIdx(idx);
    setExplanation(null);
    setExplaining(true);
    try {
      const res = await ai.getMatchExplanation(
        couple.player1,
        couple.player2,
        couple.score,
        couple.breakdown,
        couple.sharedInterests
      );
      setExplanation(res.explanation);
    } catch {
      setExplanation(
        `With a ${couple.score}% compatibility score, these two are a match made in chocolate heaven! 🍫`
      );
    } finally {
      setExplaining(false);
    }
  };

  const handleConfirm = () => {
    if (selectedIdx === null) return;
    const couple = couples[selectedIdx];
    onSelect(
      {
        name: couple.player1.name,
        interests: couple.player1.interests,
        vibe: couple.player1.vibe,
        age: couple.player1.age,
        region: couple.player1.region,
      },
      {
        name: couple.player2.name,
        interests: couple.player2.interests,
        vibe: couple.player2.vibe,
        age: couple.player2.age,
        region: couple.player2.region,
      },
      couple.score
    );
  };

  if (loading) {
    return (
      <div className="leaderboard-screen">
        <div className="loading-state">
          <div className="chocolate-spinner">💘</div>
          <p>Cupid is computing compatibility scores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-screen">
        <div className="error-state">
          <p>💔 {error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-screen">
      <div className="phase-header">
        <span className="phase-emoji">💘</span>
        <h2>Cupid's Leaderboard</h2>
        <p className="phase-sub">
          Our matchmaking AI scored every possible couple — pick yours!
        </p>
      </div>

      <div className="leaderboard-list">
        {couples.map((couple, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <div
              key={idx}
              className={`leaderboard-card ${isSelected ? "leaderboard-selected" : ""}`}
              onClick={() => handleSelect(couple, idx)}
            >
              <div className="lb-rank">
                {couple.rank <= 3 ? ["🥇", "🥈", "🥉"][couple.rank - 1] : `#${couple.rank}`}
              </div>

              <div className="lb-couple">
                <div className="lb-player">
                  <span className="lb-vibe">{VIBE_EMOJI[couple.player1.vibe] || "💜"}</span>
                  <div>
                    <div className="lb-name">{couple.player1.name}</div>
                    <div className="lb-detail">
                      {couple.player1.age}y · {couple.player1.region}
                    </div>
                  </div>
                </div>

                <span className="lb-heart">❤️</span>

                <div className="lb-player">
                  <span className="lb-vibe">{VIBE_EMOJI[couple.player2.vibe] || "💜"}</span>
                  <div>
                    <div className="lb-name">{couple.player2.name}</div>
                    <div className="lb-detail">
                      {couple.player2.age}y · {couple.player2.region}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lb-score-section">
                <div className="lb-score-bar-bg">
                  <div
                    className="lb-score-bar-fill"
                    style={{ width: `${couple.score}%` }}
                  />
                </div>
                <span className="lb-score-pct">{couple.score}%</span>
              </div>

              {couple.sharedInterests.length > 0 && (
                <div className="lb-interests">
                  {couple.sharedInterests.map((i) => (
                    <span key={i} className="lb-interest-chip">{i}</span>
                  ))}
                </div>
              )}

              {isSelected && (
                <div className="lb-explanation">
                  {/* Breakdown bars */}
                  <div className="lb-breakdown">
                    {[
                      { label: "Personality", val: couple.breakdown.ocean, emoji: "🧠" },
                      { label: "Interests", val: couple.breakdown.interests, emoji: "🎯" },
                      { label: "Chemistry", val: couple.breakdown.behavior, emoji: "⚡" },
                      { label: "Age fit", val: couple.breakdown.ageFit, emoji: "🎂" },
                      { label: "Location", val: couple.breakdown.region, emoji: "📍" },
                    ].map((s) => (
                      <div key={s.label} className="lb-signal">
                        <span className="lb-signal-label">
                          {s.emoji} {s.label}
                        </span>
                        <div className="lb-signal-bar-bg">
                          <div
                            className="lb-signal-bar-fill"
                            style={{ width: `${Math.round(s.val * 100)}%` }}
                          />
                        </div>
                        <span className="lb-signal-val">{Math.round(s.val * 100)}%</span>
                      </div>
                    ))}
                  </div>

                  {/* AI explanation */}
                  <div className="lb-ai-blurb">
                    {explaining ? (
                      <p className="lb-typing">💘 Cupid is writing their love story...</p>
                    ) : (
                      <p>{explanation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedIdx !== null && (
        <div className="lb-confirm-bar">
          <button className="btn-primary btn-lg" onClick={handleConfirm}>
            Play as this couple! 🍫
          </button>
        </div>
      )}
    </div>
  );
}
