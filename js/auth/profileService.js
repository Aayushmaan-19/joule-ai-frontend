import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

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
