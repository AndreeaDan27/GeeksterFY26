import { useState } from "react";
import Confetti from "react-confetti";

export default function Welcome({ onStart }) {
  const [showConfetti, setShowConfetti] = useState(false);

  const handleStart = () => {
    setShowConfetti(true);
    setTimeout(() => onStart(), 1500);
  };

  return (
    <div className="welcome-screen">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          recycle={false}
          colors={["#8B4513", "#D2691E", "#F5DEB3", "#FF69B4", "#FFD700"]}
        />
      )}

      <div className="welcome-content">
        <div className="welcome-emoji">🍫</div>
        <h1 className="welcome-title">CoupleChoc</h1>
        <p className="welcome-subtitle">The AI Chocolate Experience for Two</p>

        <div className="welcome-features">
          <div className="feature-card">
            <span className="feature-icon">🎲</span>
            <span>Duo Tasting Challenges</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">❤️</span>
            <span>Romantic Side-Quests</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🍳</span>
            <span>Smart Pairing Engine</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">💬</span>
            <span>Fun Conversation Prompts</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🎁</span>
            <span>Gift Recommendations</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📸</span>
            <span>Memory Mode</span>
          </div>
        </div>

        <button className="btn-primary btn-lg" onClick={handleStart}>
          Start Your Chocolate Date 💝
        </button>

        <p className="welcome-footer">
          Powered by Cupid Chocolate Company & Azure OpenAI
        </p>
      </div>
    </div>
  );
}
