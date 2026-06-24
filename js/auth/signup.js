import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase.js";

export const signup = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
