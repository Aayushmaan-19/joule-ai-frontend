import { signOut } from "firebase/auth";

import { auth } from "./firebase.js";

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
};