import { API_URL } from "../utils/constants.js";
import { getTokenOptional } from "../auth/getToken.js";

export async function getAIReply(message) {

  const token = await getTokenOptional();

  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers,

    body: JSON.stringify({
      message
    })
  });

  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // response body wasn't JSON — fall back to generic message
    }

    throw new Error(errorMessage);
  }

  return response.json();
}