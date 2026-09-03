import { SOCIAL_API_URL } from "../utils/constants.js";
import { getToken } from "../auth/getToken.js";

async function post(path, body) {
  const token = await getToken();

  const response = await fetch(`${SOCIAL_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export function sendFollowRequest(targetUid) {
  return post("/follow", { targetUid });
}

export function acceptFollowRequest(requesterUid) {
  return post("/follow/accept", { requesterUid });
}

export function declineFollowRequest(requesterUid) {
  return post("/follow/decline", { requesterUid });
}

export function cancelFollowRequest(targetUid) {
  return post("/follow/cancel", { targetUid });
}

export function unfollow(targetUid) {
  return post("/unfollow", { targetUid });
}

export function sendMessage(toUid, text, replyTo = null) {
  return post("/message/send", { toUid, text, replyTo });
}

export function editMessage(conversationId, messageId, text) {
  return post("/message/edit", { conversationId, messageId, text });
}

export function deleteMessage(conversationId, messageId) {
  return post("/message/delete", { conversationId, messageId });
}

export function reactToMessage(conversationId, messageId, emoji) {
  return post("/message/react", { conversationId, messageId, emoji });
}

export function forwardMessage(conversationId, messageId, toUid) {
  return post("/message/forward", { conversationId, messageId, toUid });
}

export function markConversationRead(conversationId) {
  return post("/message/read", { conversationId });
}

export function pingTyping(conversationId) {
  return post("/typing", { conversationId });
}
