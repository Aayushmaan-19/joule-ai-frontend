import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "./firebase.js";
import { describeAuthError } from "./authErrors.js";

export const login = async (email, password) => {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (!user.emailVerified) {
      return { success: false, unverified: true, error: "Please verify your email first." };
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: describeAuthError(error, "login") };
  }
};
