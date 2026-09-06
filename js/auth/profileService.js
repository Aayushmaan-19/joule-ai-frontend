import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { PROFILE_API_URL } from "../utils/constants.js";
import { getToken } from "./getToken.js";

export async function fetchProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));

  if (!snap.exists()) {
    return null;
  }

  return snap.data();
}

export async function updateProfile(uid, { displayName, avatar }) {
  await setDoc(
    doc(db, "users", uid),
    {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(avatar !== undefined ? { avatar } : {})
    },
    { merge: true }
  );
}

/**
 * Uploads a cropped avatar blob to the backend, which stores it in
 * Firebase Storage and updates the user's Firestore avatar field
 * itself — unlike updateProfile() above, this goes through the
 * backend rather than a direct client write, since it needs the
 * Admin SDK to write to Storage.
 */
/**
 * Unlike updateProfile() above, username changes go through the
 * backend — uniqueness has to be enforced atomically (a direct
 * client read-then-write has a race condition two people could hit
 * at once), which needs a Firestore transaction only the Admin SDK
 * can run safely.
 */
export async function setUsername(username) {
  const token = await getToken();

  const response = await fetch(`${PROFILE_API_URL}/username`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ username })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Couldn't update your username.");
  }

  return response.json();
}

export async function uploadAvatarImage(blob) {
  const token = await getToken();

  const formData = new FormData();
  formData.append("avatar", blob, "avatar.jpg");

  const response = await fetch(`${PROFILE_API_URL}/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  if (!response.ok) {
    let errorMessage = "Upload failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
