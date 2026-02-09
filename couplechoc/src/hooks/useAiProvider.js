import { useContext } from "react";
import { AiProviderContext } from "../context/AiContext";

/**
 * Hook to access the AI provider context
 */
export function useAiProvider() {
  const context = useContext(AiProviderContext);
  if (!context) {
    throw new Error("useAiProvider must be used within AiProviderProvider");
  }
  return context;
}
