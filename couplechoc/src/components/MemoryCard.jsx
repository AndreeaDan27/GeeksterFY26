import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useAiProvider } from "../hooks/useAiProvider";
import Confetti from "react-confetti";
import { MemoryMarkdownComponents } from "./shared/MarkdownRenderers";

export default function MemoryCard({ player1, player2, highlights, onRestart }) {
  const { ai } = useAiProvider();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const cardRef = useRef(null);

  const loadCard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ai.getMemoryCard(
        player1.name,
        player2.name,
        highlights.join("; ")
      );
      setCard(result.card);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (err) {
      console.error("Memory card error:", err);
      setCard("✨ Your chocolate date was truly special! ✨");
    } finally {
      setLoading(false);
    }
  }, [ai, player1.name, player2.name, highlights]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  const handleShare = async () => {
    const text = `🍫 CoupleChoc Memory Card 🍫\n\n${card}\n\n${player1.name} & ${player2.name}\nFebruary 6, 2026`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "CoupleChoc Memory", text });
      } catch {
        // User cancelled share or share failed silently
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Memory card copied to clipboard! 📋");
    }
  };

  return (
    <div className="memory-screen">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={300}
          recycle={false}
          colors={["#8B4513", "#D2691E", "#F5DEB3", "#FF69B4", "#FFD700", "#FF1493"]}
        />
      )}

      <div className="phase-header">
        <span className="phase-emoji">📸</span>
        <h2>Your Memory Card</h2>
        <p className="phase-sub">A keepsake from your chocolate date</p>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="chocolate-spinner">📸</div>
          <p>Creating your beautiful memory card...</p>
        </div>
      )}

      {card && (
        <>
          <div className="memory-card-display" ref={cardRef}>
            <div className="memory-card-inner">
              <div className="memory-card-header">
                <span className="memory-logo">🍫</span>
                <span className="memory-brand">CoupleChoc</span>
              </div>

              <div className="memory-card-content">
                <ReactMarkdown components={MemoryMarkdownComponents}>
                  {card}
                </ReactMarkdown>
              </div>

              <div className="memory-card-footer">
                <p>
                  {player1.name} & {player2.name}
                </p>
                <p className="memory-date">February 6, 2026 💝</p>
              </div>
            </div>
          </div>

          {/* Date highlights */}
          {highlights.length > 0 && (
            <div className="highlights-section">
              <h3>Your Date Highlights</h3>
              <ul className="highlights-list">
                {highlights.map((h, i) => (
                  <li key={i}>✨ {h}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="memory-actions">
            <button className="btn-secondary" onClick={handleShare}>
              📤 Share Memory
            </button>
            <button className="btn-secondary" onClick={loadCard}>
              🔄 Regenerate Card
            </button>
            <button className="btn-primary" onClick={onRestart}>
              🍫 New Chocolate Date
            </button>
          </div>
        </>
      )}
    </div>
  );
}
