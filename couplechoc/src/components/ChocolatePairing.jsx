import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { getPairing, getConversationPrompt, shipGifts } from "../services/api";
import { MarkdownComponents, InlineMarkdownComponents } from "./shared/MarkdownRenderers";

export default function ChocolatePairing({ player1, player2, onComplete }) {
  const [pairing, setPairing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversationPrompt, setConversationPrompt] = useState(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [shipmentStatus, setShipmentStatus] = useState(null); // null, 'shipping', 'shipped'
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPairing();
  }, []);

  const loadPairing = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPairing(player1, player2);
      setPairing(result.pairing);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationPrompt = async () => {
    setPromptLoading(true);
    try {
      const result = await getConversationPrompt();
      setConversationPrompt(result.prompt);
    } catch (err) {
      console.error("Failed to load conversation prompt:", err);
    } finally {
      setPromptLoading(false);
    }
  };

  const handleShipGifts = async () => {
    if (!conversationPrompt) {
      // Auto-generate a conversation prompt first
      setPromptLoading(true);
      try {
        const result = await getConversationPrompt();
        setConversationPrompt(result.prompt);
        await performShipment(result.prompt);
      } catch (err) {
        setError("Failed to generate gift message. Please try again.");
        setPromptLoading(false);
      }
    } else {
      await performShipment(conversationPrompt);
    }
  };

  const performShipment = async (message) => {
    setShipmentStatus('shipping');
    try {
      const result = await shipGifts(player1, player2, pairing, message);
      setShipmentStatus('shipped');
      // Allow user to see the success state before moving on
      setTimeout(() => {
        onComplete({ pairing, message, shipment: result });
      }, 2000);
    } catch (err) {
      setError(err.message);
      setShipmentStatus(null);
    }
  };

  return (
    <div className="pairing-screen">
      <div className="phase-header">
        <span className="phase-emoji">🍫</span>
        <h2>Your Chocolate Pairing</h2>
        <p className="phase-sub">
          Curated for {player1.name} & {player2.name}
        </p>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="chocolate-spinner">🍫</div>
          <p>Our chocolatier AI is crafting your perfect pairing...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>😅 {error}</p>
          <button className="btn-secondary" onClick={loadPairing}>
            Try Again
          </button>
        </div>
      )}

      {pairing && shipmentStatus !== 'shipped' && (
        <div className="pairing-result">
          <div className="ai-response markdown-content">
            <ReactMarkdown components={MarkdownComponents}>
              {pairing}
            </ReactMarkdown>
          </div>

          {/* Conversation Prompt Section */}
          <div className="gift-message-section">
            <h3>💌 Gift Message</h3>
            <p className="section-desc">This message will be included with the chocolate shipment to both of you</p>
            
            {!conversationPrompt && !promptLoading && (
              <button className="btn-secondary" onClick={loadConversationPrompt}>
                ✨ Generate a Sweet Message
              </button>
            )}

            {promptLoading && (
              <div className="loading-inline">
                <span className="spinner-small">💬</span> Crafting your message...
              </div>
            )}

            {conversationPrompt && (
              <div className="conversation-prompt-card">
                <ReactMarkdown
                  components={InlineMarkdownComponents}
                >
                  {conversationPrompt}
                </ReactMarkdown>
                <button className="btn-ghost" onClick={loadConversationPrompt} disabled={promptLoading}>
                  🔄 Different message
                </button>
              </div>
            )}
          </div>

          {/* Shipping Actions */}
          <div className="shipping-section">
            <div className="shipping-info">
              <h3>📦 Ship These Chocolates</h3>
              <div className="shipping-recipients">
                <div className="recipient-card">
                  <span className="recipient-icon">🎁</span>
                  <span className="recipient-name">{player1.name}</span>
                  <span className="recipient-region">{player1.region}</span>
                </div>
                <span className="shipping-arrow">→</span>
                <div className="recipient-card">
                  <span className="recipient-icon">🎁</span>
                  <span className="recipient-name">{player2.name}</span>
                  <span className="recipient-region">{player2.region}</span>
                </div>
              </div>
            </div>

            <div className="pairing-actions">
              <button className="btn-secondary" onClick={loadPairing}>
                🔄 New Pairing
              </button>
              <button 
                className="btn-primary btn-lg" 
                onClick={handleShipGifts}
                disabled={shipmentStatus === 'shipping'}
              >
                {shipmentStatus === 'shipping' ? (
                  <>📦 Shipping...</>
                ) : (
                  <>🚀 Ship Gifts to Both</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {shipmentStatus === 'shipped' && (
        <div className="shipment-success">
          <div className="success-animation">🎉</div>
          <h2>Gifts Shipped!</h2>
          <p>Chocolate packages are on their way to {player1.name} & {player2.name}</p>
          <div className="shipment-details">
            <div className="shipment-recipient">
              <span className="check">✓</span> {player1.name} — {player1.region}
            </div>
            <div className="shipment-recipient">
              <span className="check">✓</span> {player2.name} — {player2.region}
            </div>
          </div>
          <p className="shipment-message-preview">
            <em>"{conversationPrompt?.substring(0, 100)}..."</em>
          </p>
        </div>
      )}
    </div>
  );
}
