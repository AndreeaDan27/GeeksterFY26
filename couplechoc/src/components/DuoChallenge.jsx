import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getChallenge, getQuest } from "../services/api";
import { MarkdownComponents } from "./shared/MarkdownRenderers";

export default function DuoChallenge({ player1, player2, onComplete, addHighlight }) {
  const [round, setRound] = useState(0);
  const [challenge, setChallenge] = useState(null);
  const [quest, setQuest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [questLoading, setQuestLoading] = useState(false);
  const [previousChallenges, setPreviousChallenges] = useState([]);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [error, setError] = useState(null);

  const loadChallenge = async () => {
    setLoading(true);
    setError(null);
    setQuest(null);
    try {
      const newRound = round + 1;
      const result = await getChallenge(
        player1.name,
        player2.name,
        newRound,
        previousChallenges.join("; ")
      );
      setChallenge(result.challenge);
      setRound(newRound);
      setPreviousChallenges((prev) => [
        ...prev,
        result.challenge.substring(0, 50),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuest = async () => {
    setQuestLoading(true);
    try {
      const result = await getQuest(player1.name, player2.name, round);
      setQuest(result.quest);
      addHighlight(`Romantic quest completed in round ${round}!`);
    } catch (err) {
      console.error("Quest error:", err);
    } finally {
      setQuestLoading(false);
    }
  };

  const addScore = (player) => {
    setScores((prev) => ({
      ...prev,
      [player]: prev[player] + 1,
    }));
    addHighlight(
      `${player === "player1" ? player1.name : player2.name} won round ${round}!`
    );
  };

  return (
    <div className="challenge-screen">
      <div className="phase-header">
        <span className="phase-emoji">🎲</span>
        <h2>Duo Challenge</h2>
        <p className="phase-sub">Round {round || "—"} of your chocolate adventure</p>
      </div>

      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="score-player">
          <span className="score-name">{player1.name}</span>
          <span className="score-value">{scores.player1}</span>
        </div>
        <div className="score-vs">VS</div>
        <div className="score-player">
          <span className="score-name">{player2.name}</span>
          <span className="score-value">{scores.player2}</span>
        </div>
      </div>

      {/* No challenge yet */}
      {!challenge && !loading && (
        <div className="challenge-start">
          <p>Ready to compete? Each round brings a new chocolate challenge!</p>
          <button className="btn-primary btn-lg" onClick={loadChallenge}>
            Start Challenge! 🎲
          </button>
          <button className="btn-ghost" onClick={onComplete} style={{ marginTop: '12px' }}>
            Skip to Gifts →
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="chocolate-spinner">🎲</div>
          <p>Generating your next challenge...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>😅 {error}</p>
          <button className="btn-secondary" onClick={loadChallenge}>
            Try Again
          </button>
        </div>
      )}

      {challenge && !loading && (
        <div className="challenge-card">
          <div className="ai-response markdown-content">
            <ReactMarkdown components={MarkdownComponents}>
              {challenge}
            </ReactMarkdown>
          </div>

          <div className="challenge-scoring">
            <p>Who won this round?</p>
            <div className="score-buttons">
              <button
                className="btn-score p1"
                onClick={() => addScore("player1")}
              >
                {player1.name} wins! 🏆
              </button>
              <button className="btn-score tie" onClick={() => {}}>
                It's a tie! 🤝
              </button>
              <button
                className="btn-score p2"
                onClick={() => addScore("player2")}
              >
                {player2.name} wins! 🏆
              </button>
            </div>
          </div>

          <div className="challenge-actions">
            <button
              className="btn-secondary"
              onClick={loadQuest}
              disabled={questLoading}
            >
              {questLoading ? "Loading..." : "❤️ Romantic Side-Quest"}
            </button>
            <button className="btn-secondary" onClick={loadChallenge}>
              🎲 Next Challenge
            </button>
            {round >= 1 && (
              <button className="btn-primary" onClick={onComplete}>
                Continue to Gifts 🎁
              </button>
            )}
          </div>

          {quest && (
            <div className="quest-card">
              <h3>❤️ Romantic Side-Quest</h3>
              <div className="ai-response markdown-content">
                <ReactMarkdown components={MarkdownComponents}>
                  {quest}
                </ReactMarkdown>
              </div>
              <p className="quest-reminder">📸 Take a photo of this moment!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
