import { useState, useEffect, useCallback } from "react";
import {
  isPromptApiAvailable,
  getAiStatus,
  destroySession,
  localSendChat,
  localGetPairing,
  localGetConversationPrompt,
  localGetMemoryCard,
  localGetMatchExplanation,
} from "../services/localAi";
import * as cloudApi from "../services/api";
import { AiProviderContext } from "./AiContext";

// Storage key for persisting preference
const STORAGE_KEY = "couplechoc_ai_provider";

/**
 * AI Provider Context
 * Manages switching between cloud (OpenAI) and local (Prompt API) AI providers
 */
export function AiProviderProvider({ children }) {
  // 'cloud' | 'local'
  const [provider, setProvider] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "cloud";
    } catch {
      return "cloud";
    }
  });

  const [localAiStatus, setLocalAiStatus] = useState({
    available: false,
    checking: true,
    message: "Checking local AI availability...",
  });

  const checkLocalAi = useCallback(async () => {
    setLocalAiStatus((prev) => ({ ...prev, checking: true }));
    const available = await isPromptApiAvailable();
    if (available) {
      const status = await getAiStatus();
      setLocalAiStatus({
        available: status.available,
        checking: false,
        status: status.status,
        message: status.message || status.reason,
      });
    } else {
      setLocalAiStatus({
        available: false,
        checking: false,
        message:
          "Local AI not available. Use Microsoft Edge with Prompt API enabled.",
      });
    }
  }, []);

  // Check local AI availability on mount
  useEffect(() => {
    // Using a flag to avoid lint warnings about setState in effects
    let mounted = true;
    (async () => {
      const available = await isPromptApiAvailable();
      if (!mounted) return;
      if (available) {
        const status = await getAiStatus();
        if (!mounted) return;
        setLocalAiStatus({
          available: status.available,
          checking: false,
          status: status.status,
          message: status.message || status.reason,
        });
      } else {
        setLocalAiStatus({
          available: false,
          checking: false,
          message:
            "Local AI not available. Use Microsoft Edge with Prompt API enabled.",
        });
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist provider preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, provider);
    } catch {
      // Ignore storage errors
    }
  }, [provider]);

  // Cleanup local AI session on unmount
  useEffect(() => {
    return () => {
      if (provider === "local") {
        destroySession();
      }
    };
  }, [provider]);

  const switchProvider = useCallback(
    (newProvider) => {
      if (newProvider === "local" && !localAiStatus.available) {
        console.warn("Cannot switch to local AI - not available");
        return false;
      }
      if (provider === "local" && newProvider === "cloud") {
        destroySession();
      }
      setProvider(newProvider);
      return true;
    },
    [provider, localAiStatus.available]
  );

  // Unified API that routes to the correct provider
  const ai = {
    // Chat endpoint
    sendChat: async (messages, context) => {
      if (provider === "local") {
        return localSendChat(messages, context);
      }
      return cloudApi.sendChat(messages, context);
    },

    // Pairing endpoint
    getPairing: async (player1, player2) => {
      if (provider === "local") {
        return localGetPairing(player1, player2);
      }
      return cloudApi.getPairing(player1, player2);
    },

    // Conversation prompt endpoint
    getConversationPrompt: async () => {
      if (provider === "local") {
        return localGetConversationPrompt();
      }
      return cloudApi.getConversationPrompt();
    },

    // Memory card endpoint
    getMemoryCard: async (player1Name, player2Name, highlights) => {
      if (provider === "local") {
        return localGetMemoryCard(player1Name, player2Name, highlights);
      }
      return cloudApi.getMemoryCard(player1Name, player2Name, highlights);
    },

    // Match explanation endpoint
    getMatchExplanation: async (player1, player2, score, breakdown, sharedInterests) => {
      if (provider === "local") {
        return localGetMatchExplanation(player1, player2, score, breakdown, sharedInterests);
      }
      return cloudApi.getMatchExplanation(player1, player2, score, breakdown, sharedInterests);
    },
  };

  const value = {
    provider,
    setProvider: switchProvider,
    localAiStatus,
    checkLocalAi,
    ai,
    isLocalAi: provider === "local",
    isCloudAi: provider === "cloud",
  };

  return (
    <AiProviderContext.Provider value={value}>
      {children}
    </AiProviderContext.Provider>
  );
}
