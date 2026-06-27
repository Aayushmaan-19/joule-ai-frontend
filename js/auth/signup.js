import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { auth } from "./firebase.js";

let pendingCredential = null;

export const signup = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    pendingCredential = userCredential.user;
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export async function deleteUnverifiedAccount() {
  if (!pendingCredential) return;

  const user = pendingCredential;
  pendingCredential = null;

  if (!user.emailVerified) {
    try {
      await deleteUser(user);
    } catch {
    }
  }
}

export function clearPendingCredential() {
  pendingCredential = null;
}