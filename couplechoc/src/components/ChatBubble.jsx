import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { sendChat } from "../services/api";

const ChatMarkdown = {
  p: ({ children }) => <span className="chat-md-p">{children}</span>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="chat-md-list">{children}</ul>,
  ol: ({ children }) => <ol className="chat-md-list">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
};

export default function ChatBubble({ isOpen, onToggle, player1, player2 }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hey ${player1.name} & ${player2.name}! 🍫 I'm your CoupleChoc assistant. Ask me anything about chocolate, your date, or just say hi!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = newMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      const context = `Couple profile — ${player1.name}: interests=${player1.interests.join(",")}, vibe=${player1.vibe}. ${player2.name}: interests=${player2.interests.join(",")}, vibe=${player2.vibe}.`;

      const result = await sendChat(apiMessages, context);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Oops, I melted for a moment! 🍫 Try again?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button className="chat-fab" onClick={onToggle} title="Chat with CoupleChoc">
        💬
      </button>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>🍫 CoupleChoc Chat</span>
        <button className="chat-close" onClick={onToggle}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg ${msg.role === "user" ? "chat-user" : "chat-bot"}`}
          >
            {msg.role === "assistant" ? (
              <ReactMarkdown components={ChatMarkdown}>{msg.content}</ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-bot chat-typing">
            <span className="typing-dots">● ● ●</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask CoupleChoc anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
