import { auth, db } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { AUTH_API_URL } from "../utils/constants.js";

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
    // Firestore user doc is created here — only after OTP passes
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
      plan: "free",
      messagesUsed: 0,
      voiceUsed: 0,
      emailVerified: true
    });

    // Force token refresh so emailVerified flips on the local user object
    await user.getIdToken(true);
    await user.reload();
  }

  return data;
}
