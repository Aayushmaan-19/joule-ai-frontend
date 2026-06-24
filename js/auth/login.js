import {
  signInWithEmailAndPassword
} from "firebase/auth";

import { auth } from "./firebase.js";

export const login = async (
  email,
  password
) => {
  try {
    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    if (!user.emailVerified) {
      return {
        success: false,
        error:
          "Please verify your email first."
      };
    }

    return {
      success: true,
      user
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};