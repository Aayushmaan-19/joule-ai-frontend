import { auth } from "./firebase.js";

export function isAuthenticated() {
  return !!auth.currentUser;
}