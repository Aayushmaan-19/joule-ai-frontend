import { API_URL } from "../utils/constants.js";
import { getTokenOptional } from "../auth/getToken.js";
import state from "../config/state.js";

/**
 * Streams the AI's reply, calling onChunk(accumulatedTextSoFar) as each
 * piece arrives from the backend, instead of waiting for the full
 * reply before showing anything.
 *
 * @param {string} message
 * @param {(partialText: string) => void} onChunk
 * @returns {Promise<{ reply: string, remaining: number|null, limit: number|null }>}
 */
export async function getAIReply(message, onChunk) {
  const token = await getTokenOptional();

  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const allMessages = state.chat.messages;
  const historyToSend = allMessages.slice(0, -1).slice(-10);

  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      history: historyToSend
    })
  });

  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
    }

    throw new Error(errorMessage);
  }

  const remainingHeader = response.headers.get("X-Remaining");
  const limitHeader = response.headers.get("X-Limit");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let reply = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    reply += decoder.decode(value, { stream: true });
    onChunk(reply);
  }

  return {
    reply,
    remaining: remainingHeader !== null ? Number(remainingHeader) : null,
    limit: limitHeader !== null ? Number(limitHeader) : null
  };
}
