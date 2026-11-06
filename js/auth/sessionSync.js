import { auth } from "./firebase.js";
import { AUTH_API_URL } from "../utils/constants.js";

/**
 * Tells the backend a sign-in happened (any method). The backend creates or
 * tops up the user's Firestore profile and answers with whether this person
 * is an admin / is in an "open as user" session. Other modules react to the
 * `joule:session` event; the body classes drive the admin-only UI.
 */
export async function syncSession() {
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();

  const response = await fetch(`${AUTH_API_URL}/session`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`session sync failed (${response.status})`);
  }

  const data = await response.json();

  document.body.classList.toggle("is-admin", data.isAdmin === true);
  document.body.classList.toggle("impersonating", Boolean(data.impersonatedBy));

  window.dispatchEvent(new CustomEvent("joule:session", { detail: data }));
}

export function clearSessionState() {
  document.body.classList.remove("is-admin", "impersonating");
  window.dispatchEvent(new CustomEvent("joule:session", { detail: null }));
}
