import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase.js";
import { AUTH_API_URL } from "../utils/constants.js";

/**
 * No Firebase Auth account is created here. We only ask the backend
 * to send an OTP to this email. The password is never sent at this
 * step and the backend never stores it — it's submitted again with
 * verifySignupOtp() below, at the point the account actually gets
 * created.
 */
export async function requestSignupOtp(email) {
  try {
    const response = await fetch(`${AUTH_API_URL}/signup/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || "Couldn't send verification code",
        retryAfterMs: data.retryAfterMs
      };
    }

    return { success: true };

  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

/**
 * Verifies the OTP for a pending signup. The password the user
 * originally typed is sent here (never persisted anywhere before
 * this call). On success, the backend has just created the Firebase
 * Auth account (already verified) and returns a custom token — we
 * use it to sign the user in on the client, completing the flow
 * without a second password entry.
 */
export async function verifySignupOtp(email, code, password) {
  try {
    const response = await fetch(`${AUTH_API_URL}/signup/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, message: data.message || "Incorrect code" };
    }

    await signInWithCustomToken(auth, data.customToken);

    return { success: true };

  } catch {
    return { success: false, message: "Network error. Please try again." };
  }
}