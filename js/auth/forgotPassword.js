import {
  sendPasswordResetEmail
} from "firebase/auth";

import { auth } from "./firebase.js";

export const forgotPassword = async (
  email
) => {
  try {
    await sendPasswordResetEmail(
      auth,
      email
    );

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};