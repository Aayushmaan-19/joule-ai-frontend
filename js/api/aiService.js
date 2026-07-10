import { API_URL } from "../utils/constants.js";
import { getTokenOptional } from "../auth/getToken.js";
import state from "../config/state.js";

/**
 * Streams the AI's reply, calling onChunk(delta) with each new piece of
 * text as it arrives from the backend — not the accumulated text so far —
 * so the caller can append-and-animate rather than re-render everything.
 *
 * @param {string} message
 * @param {(delta: string) => void} onChunk
 * @returns {Promise<{ reply: string, remaining: number|null, limit: number|null }>}
 */
export async function getAIReply(message, onChunk) {
  const t0 = Date.now();

  const token = await getTokenOptional();
  console.log(`[TIMING] token ready: +${Date.now() - t0}ms`);

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

  console.log(`[TIMING] response headers received: +${Date.now() - t0}ms`);

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
  let firstChunk = true;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (firstChunk) {
      console.log(`[TIMING] first chunk read: +${Date.now() - t0}ms`);
      firstChunk = false;
    }

    const delta = decoder.decode(value, { stream: true });
    reply += delta;
    onChunk(delta);
  }

  console.log(`[TIMING] stream done: +${Date.now() - t0}ms`);

  return {
    reply,
    remaining: remainingHeader !== null ? Number(remainingHeader) : null,
    limit: limitHeader !== null ? Number(limitHeader) : null
  };
}
