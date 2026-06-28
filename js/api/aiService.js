import { API_URL } from "../utils/constants.js";
import { getTokenOptional } from "../auth/getToken.js";
import state from "../config/state.js";

export async function getAIReply(message) {
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

  return response.json();
}