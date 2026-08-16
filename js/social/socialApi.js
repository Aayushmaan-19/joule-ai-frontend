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

export function unfollow(targetUid) {
  return post("/unfollow", { targetUid });
}

export function sendMessage(toUid, text) {
  return post("/message/send", { toUid, text });
}
