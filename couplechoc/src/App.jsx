import { useState } from "react";
import Welcome from "./components/Welcome";
import CupidLeaderboard from "./components/CupidLeaderboard";
import ChocolatePairing from "./components/ChocolatePairing";
import MemoryCard from "./components/MemoryCard";
import ChatBubble from "./components/ChatBubble";
import "./App.css";

const PHASES = ["welcome", "leaderboard", "pairing", "memory"];

export default function App() {
  const [phase, setPhase] = useState("welcome");
  const [players, setPlayers] = useState({ player1: null, player2: null });
  const [highlights, setHighlights] = useState([]);
  const [showChat, setShowChat] = useState(false);

  const addHighlight = (text) => setHighlights((h) => [...h, text]);

  const next = () => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) setPhase(PHASES[idx + 1]);
  };

  const goTo = (p) => setPhase(p);

  return (
    <div className="app">
      {/* Progress bar */}
      {phase !== "welcome" && (
        <div className="progress-bar">
          {PHASES.slice(1).map((p, i) => (
            <div
              key={p}
              className={`progress-step ${
                PHASES.indexOf(phase) >= i + 1 ? "active" : ""
              } ${phase === p ? "current" : ""}`}
              onClick={() => {
                if (PHASES.indexOf(phase) >= i + 1) goTo(p);
              }}
            >
              <span className="step-icon">
                {["💕", "🍫", "📸"][i]}
              </span>
              <span className="step-label">
                {["Match", "Pairing", "Memory"][i]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="main-content">
        {phase === "welcome" && <Welcome onStart={() => next()} />}
        {phase === "leaderboard" && (
          <CupidLeaderboard
            onSelect={(p1, p2, score) => {
              setPlayers({ player1: p1, player2: p2 });
              addHighlight(`${p1.name} & ${p2.name} matched with ${score}% compatibility`);
              next();
            }}
          />
        )}
        {phase === "pairing" && players.player1 && (
          <ChocolatePairing
            player1={players.player1}
            player2={players.player2}
            onComplete={(shipmentInfo) => {
              addHighlight(`Gifts shipped to ${players.player1.name} & ${players.player2.name}`);
              next();
            }}
          />
        )}
        {phase === "memory" && players.player1 && (
          <MemoryCard
            player1={players.player1}
            player2={players.player2}
            highlights={highlights}
            onRestart={() => {
              setPhase("welcome");
              setPlayers({ player1: null, player2: null });
              setHighlights([]);
            }}
          />
        )}
      </main>

      {/* Floating chat bubble */}
      {phase !== "welcome" && players.player1 && (
        <ChatBubble
          isOpen={showChat}
          onToggle={() => setShowChat(!showChat)}
          player1={players.player1}
          player2={players.player2}
        />
      )}
    </div>
  );
}
