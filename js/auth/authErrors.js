/**
 * One place that turns a Firebase Auth error into something a person can
 * act on — and logs the raw error code, so when a sign-in ever fails the
 * browser console says exactly why (look for "[auth]").
 */
const MESSAGES = {
  "auth/invalid-credential":
    "Incorrect email or password. If you signed up with Google, use “Continue with Google”.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/invalid-email": "That email address doesn’t look right.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes, then try again.",
  "auth/network-request-failed":
    "Can’t reach the server. Check your connection and try again.",
  "auth/popup-blocked":
    "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
  "auth/unauthorized-domain":
    "This website address isn’t authorised for Google sign-in yet.",
  "auth/operation-not-supported-in-this-environment":
    "Google sign-in doesn’t work inside this in-app browser. Open the site in Chrome or Safari."
};

const FALLBACK = "Something went wrong signing in. Please try again.";

export function describeAuthError(error, where) {
  console.error(`[auth] ${where} failed:`, error?.code, error?.message);
  return MESSAGES[error?.code] || FALLBACK;
}
