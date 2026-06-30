import { auth } from "./firebase.js";
import { AUTH_API_URL } from "../utils/constants.js";

/**
 * Verifies an OTP for an ALREADY-AUTHENTICATED Firebase user whose
 * email isn't verified yet (e.g. a stale unverified session, or an
 * edge case outside the normal signup flow). For brand-new signups,
 * see verifySignupOtp() in signup.js instead — that path creates
 * the account itself and doesn't go through here.
 *
 * Since this user's account (and Firestore user doc) already exists,
 * we only need to flip emailVerified — no doc write needed here.
 */
export async function verifyOtp(code) {
  const user = auth.currentUser;

  if (!user) {
    return { success: false, message: "You need to be signed in first" };
  }

  const token = await user.getIdToken();

  const response = await fetch(`${AUTH_API_URL}/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ code })
  });

  const data = await response.json();

  if (data.success) {
    // Force token refresh so emailVerified flips on the local user object
    await user.getIdToken(true);
    await user.reload();
  }

  return data;
}