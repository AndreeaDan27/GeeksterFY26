import { useState } from "react";

const VIBE_OPTIONS = [
  { label: "🌹 Romantic", value: "romantic" },
  { label: "🎮 Geeky", value: "geeky" },
  { label: "🎉 Adventurous", value: "adventurous" },
  { label: "☕ Cozy", value: "cozy" },
  { label: "🔥 Spicy", value: "spicy" },
  { label: "🌙 Chill", value: "chill" },
];

const INTEREST_OPTIONS = [
  "cooking", "movies", "music", "books", "travel",
  "gaming", "art", "fitness", "photography", "tech",
];

export default function ProfileSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [player1, setPlayer1] = useState({
    name: "",
    interests: [],
    vibe: "",
    chocolatePreference: "",
  });
  const [player2, setPlayer2] = useState({
    name: "",
    interests: [],
    vibe: "",
    chocolatePreference: "",
  });

  const current = step <= 2 ? player1 : player2;
  const setCurrent = step <= 2 ? setPlayer1 : setPlayer2;
  const playerNum = step <= 2 ? 1 : 2;
  const isNameStep = step === 1 || step === 3;
  const isDetailStep = step === 2 || step === 4;

  const toggleInterest = (interest) => {
    setCurrent((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const canProceed = () => {
    if (isNameStep) return current.name.trim().length > 0;
    if (isDetailStep)
      return current.interests.length > 0 && current.vibe && current.chocolatePreference;
    return false;
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete(player1, player2);
    }
  };

  return (
    <div className="profile-setup">
      <div className="phase-header">
        <span className="phase-emoji">👤</span>
        <h2>
          Player {playerNum} — {isNameStep ? "Who are you?" : "Tell us more!"}
        </h2>
        <p className="phase-sub">Step {step} of 4</p>
      </div>

      <div className="profile-card">
        {isNameStep && (
          <div className="form-group">
            <label>What's your name?</label>
            <input
              type="text"
              className="input-field"
              placeholder={`Player ${playerNum}'s name...`}
              value={current.name}
              onChange={(e) =>
                setCurrent((prev) => ({ ...prev, name: e.target.value }))
              }
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
            />
          </div>
        )}

        {isDetailStep && (
          <>
            <div className="form-group">
              <label>Pick your interests (select multiple):</label>
              <div className="chip-grid">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    className={`chip ${
                      current.interests.includes(interest) ? "chip-active" : ""
                    }`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Your vibe today:</label>
              <div className="chip-grid">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    className={`chip ${
                      current.vibe === v.value ? "chip-active" : ""
                    }`}
                    onClick={() =>
                      setCurrent((prev) => ({ ...prev, vibe: v.value }))
                    }
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Chocolate preference:</label>
              <div className="chip-grid">
                {["🍫 Dark", "🥛 Milk", "🤍 White", "🌈 Surprise me!"].map(
                  (pref) => (
                    <button
                      key={pref}
                      className={`chip ${
                        current.chocolatePreference === pref
                          ? "chip-active"
                          : ""
                      }`}
                      onClick={() =>
                        setCurrent((prev) => ({
                          ...prev,
                          chocolatePreference: pref,
                        }))
                      }
                    >
                      {pref}
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        )}

        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {step < 4 ? "Next →" : "Let's Go! 🍫"}
        </button>
      </div>
    </div>
  );
}
