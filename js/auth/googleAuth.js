import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase.js";

const provider = new GoogleAuthProvider();

/**
 * Signs in only. The user's Firestore profile is created by the backend
 * (POST /api/auth/session, called from authState.js for every sign-in
 * method) — a popup that succeeded must never be reported as failed
 * because a second, unrelated step went wrong.
 */
export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, provider);
  return { success: true, user };
}
