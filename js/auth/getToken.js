import { auth } from "./firebase.js";

export async function getToken() {

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Login required");
  }

  if (!user.emailVerified) {
    throw new Error("Verify your email first");
  }

  return await user.getIdToken();
}

/**
 * Like getToken(), but never throws. Returns the user's ID token if
 * they're logged in and verified, or null otherwise (guest, logged
 * out, or unverified). Used by routes that work for guests too,
 * like /api/ai/chat.
 */
export async function getTokenOptional() {

  const user = auth.currentUser;

  if (!user || !user.emailVerified) {
    return null;
  }

  return await user.getIdToken();
}