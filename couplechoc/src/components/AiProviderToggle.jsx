import { useState } from "react";
import { useAiProvider } from "../hooks/useAiProvider";

/**
 * AI Provider Toggle Component
 * Allows users to switch between cloud (OpenAI) and local (Prompt API) AI
 */
export default function AiProviderToggle() {
  const { provider, setProvider, localAiStatus } = useAiProvider();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleToggle = () => {
    if (provider === "cloud") {
      if (localAiStatus.available) {
        setProvider("local");
      } else {
        // Show tooltip explaining why it can't switch
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 3000);
      }
    } else {
      setProvider("cloud");
    }
  };

  return (
    <div className="ai-toggle-container">
      <button
        className={`ai-toggle-btn ${provider === "local" ? "local-active" : "cloud-active"}`}
        onClick={handleToggle}
        title={
          provider === "cloud"
            ? "Using Cloud AI (OpenAI)"
            : "Using Local AI (Prompt API)"
        }
      >
        <span className="ai-toggle-icon">
          {provider === "cloud" ? "☁️" : "💻"}
        </span>
        <span className="ai-toggle-label">
          {provider === "cloud" ? "Cloud" : "Local"} AI
        </span>
        {localAiStatus.checking && (
          <span className="ai-status-dot checking" title="Checking...">●</span>
        )}
        {!localAiStatus.checking && localAiStatus.available && (
          <span
            className="ai-status-dot available"
            title="Local AI available"
          >●</span>
        )}
        {!localAiStatus.checking && !localAiStatus.available && (
          <span
            className="ai-status-dot unavailable"
            title={localAiStatus.message}
          >●</span>
        )}
      </button>

      {showTooltip && (
        <div className="ai-toggle-tooltip">
          <p>🔒 Local AI not available</p>
          <p className="tooltip-detail">{localAiStatus.message}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Expanded AI Settings Panel
 * Shows more detailed AI provider settings
 */
export function AiSettingsPanel({ onClose }) {
  const { provider, setProvider, localAiStatus, checkLocalAi } = useAiProvider();

  return (
    <div className="ai-settings-panel">
      <div className="ai-settings-header">
        <h3>🤖 AI Settings</h3>
        {onClose && (
          <button className="ai-settings-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="ai-settings-content">
        <p className="ai-settings-desc">
          Choose which AI powers your CoupleChoc experience
        </p>

        <div className="ai-option-cards">
          {/* Cloud AI Option */}
          <div
            className={`ai-option-card ${provider === "cloud" ? "selected" : ""}`}
            onClick={() => setProvider("cloud")}
          >
            <div className="ai-option-icon">☁️</div>
            <div className="ai-option-info">
              <h4>Cloud AI</h4>
              <p>Powered by OpenAI</p>
              <ul>
                <li>✓ Most capable responses</li>
                <li>✓ Always available</li>
                <li>○ Requires internet</li>
              </ul>
            </div>
            {provider === "cloud" && <span className="ai-option-check">✓</span>}
          </div>

          {/* Local AI Option */}
          <div
            className={`ai-option-card ${provider === "local" ? "selected" : ""} ${
              !localAiStatus.available ? "disabled" : ""
            }`}
            onClick={() => localAiStatus.available && setProvider("local")}
          >
            <div className="ai-option-icon">💻</div>
            <div className="ai-option-info">
              <h4>Local AI</h4>
              <p>Microsoft Edge Prompt API</p>
              <ul>
                <li>✓ Private & offline</li>
                <li>✓ Zero latency</li>
                <li>
                  {localAiStatus.available ? "✓" : "✗"}{" "}
                  {localAiStatus.checking
                    ? "Checking..."
                    : localAiStatus.available
                    ? "Available"
                    : "Not available"}
                </li>
              </ul>
            </div>
            {provider === "local" && <span className="ai-option-check">✓</span>}
          </div>
        </div>

        {/* Status message */}
        {!localAiStatus.available && !localAiStatus.checking && (
          <div className="ai-status-message">
            <p>💡 <strong>Enable Local AI:</strong></p>
            <ol>
              <li>Use Microsoft Edge (version 127+)</li>
              <li>Go to <code>edge://flags</code></li>
              <li>Search for "Prompt API"</li>
              <li>Enable the flag and restart</li>
            </ol>
            <button className="btn-ghost" onClick={checkLocalAi}>
              🔄 Check Again
            </button>
          </div>
        )}

        {localAiStatus.status === "downloadable" && (
          <div className="ai-status-message info">
            <p>📥 The local AI model needs to be downloaded first (~1-2GB).</p>
            <p>It will start downloading when you switch to Local AI.</p>
          </div>
        )}
      </div>
    </div>
  );
}
