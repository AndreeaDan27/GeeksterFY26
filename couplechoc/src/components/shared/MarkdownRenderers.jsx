/**
 * Shared ReactMarkdown component maps.
 * Import these instead of duplicating across components.
 */

/** Standard markdown renderers for AI response cards */
export const MarkdownComponents = {
  h1: ({ children }) => <h2 className="md-heading">{children}</h2>,
  h2: ({ children }) => <h3 className="md-heading">{children}</h3>,
  h3: ({ children }) => <h4 className="md-heading">{children}</h4>,
  p: ({ children }) => <p className="md-paragraph">{children}</p>,
  ul: ({ children }) => <ul className="md-list">{children}</ul>,
  ol: ({ children }) => <ol className="md-list md-list-ordered">{children}</ol>,
  li: ({ children }) => <li className="md-list-item">{children}</li>,
  strong: ({ children }) => <strong className="md-bold">{children}</strong>,
  em: ({ children }) => <em className="md-italic">{children}</em>,
  blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
  hr: () => <hr className="md-divider" />,
};

/** Memory card renderers (light text on dark chocolate background) */
export const MemoryMarkdownComponents = {
  h1: ({ children }) => <h2 className="memory-md-heading">{children}</h2>,
  h2: ({ children }) => <h3 className="memory-md-heading">{children}</h3>,
  h3: ({ children }) => <h4 className="memory-md-heading">{children}</h4>,
  p: ({ children }) => <p className="memory-md-paragraph">{children}</p>,
  ul: ({ children }) => <ul className="memory-md-list">{children}</ul>,
  ol: ({ children }) => <ol className="memory-md-list">{children}</ol>,
  li: ({ children }) => <li className="memory-md-list-item">{children}</li>,
  strong: ({ children }) => <strong className="memory-md-bold">{children}</strong>,
  em: ({ children }) => <em className="memory-md-italic">{children}</em>,
  blockquote: ({ children }) => <blockquote className="memory-md-blockquote">{children}</blockquote>,
  hr: () => <hr className="memory-md-divider" />,
};

/** Inline markdown renderers for compact contexts (chat, prompt cards) */
export const InlineMarkdownComponents = {
  p: ({ children }) => <p className="md-paragraph">{children}</p>,
  strong: ({ children }) => <strong className="md-bold">{children}</strong>,
  em: ({ children }) => <em className="md-italic">{children}</em>,
};

/** Chat-specific markdown renderers (compact spacing) */
export const ChatMarkdownComponents = {
  p: ({ children }) => <span className="chat-md-p">{children}</span>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="chat-md-list">{children}</ul>,
  ol: ({ children }) => <ol className="chat-md-list">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
};
