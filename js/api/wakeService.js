import { WAKE_API_URL } from "../utils/constants.js";
import { getTokenOptional } from "../auth/getToken.js";
import { setBackendAwake } from "../config/actions.js";
import { isBackendAwake } from "../config/selectors.js";

/**
 * Pings the backend's dedicated /api/wake endpoint to end Render's
 * cold start before the user's first real request needs to pay for
 * it. This is the one place that ping is sent from — the loading
 * screen calls it as soon as the app boots, and the People section
 * calls it again (as a no-op once already awake) as a safety net in
 * case that first ping silently failed.
 *
 * Never throws: a failed ping just means the first real chat/social
 * request pays the cold-start cost itself, same as if this never ran.
 */
export async function wakeBackend() {
  if (isBackendAwake()) return;

  try {
    const token = await getTokenOptional();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(WAKE_API_URL, { method: "POST", headers });
    if (response.ok) setBackendAwake(true);
  } catch {
    // Silent by design.
  }
}
