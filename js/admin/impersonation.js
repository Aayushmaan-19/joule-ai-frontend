import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "../auth/firebase.js";
import { exitImpersonation } from "./adminApi.js";

/**
 * While an admin has opened an account with "Open as user", a bar across the
 * top says so and offers a way back. The session is recognised by the
 * backend (a claim it signed when the session started), never by anything
 * the browser says about itself.
 */

const bar = document.createElement("div");
bar.id = "impersonationBar";
bar.className = "imp-bar hidden";
bar.setAttribute("role", "status");
bar.innerHTML = `
  <span class="imp-dot" aria-hidden="true"></span>
  <span class="imp-text">Viewing as <strong></strong> — admin session</span>
  <button type="button" class="imp-exit">Back to my account</button>
`;
document.body.appendChild(bar);

const text = bar.querySelector(".imp-text strong");
const exitBtn = bar.querySelector(".imp-exit");

window.addEventListener("joule:session", event => {
  const session = event.detail;

  if (session?.impersonatedBy) {
    text.textContent = auth.currentUser?.email || "this user";
    bar.classList.remove("hidden");
    document.body.classList.add("imp-active");
  } else {
    bar.classList.add("hidden");
    document.body.classList.remove("imp-active");
  }
});

exitBtn.addEventListener("click", async () => {
  exitBtn.disabled = true;
  exitBtn.textContent = "Switching…";

  try {
    const { customToken } = await exitImpersonation();
    await signInWithCustomToken(auth, customToken);
    exitBtn.textContent = "Back to my account";
  } catch (err) {
    console.error("[admin] exit failed:", err.message);
    // Couldn't swap back: the safe fallback is to end this session entirely.
    exitBtn.textContent = "Couldn’t switch — signing out";
    setTimeout(() => signOut(auth), 1200);
  } finally {
    exitBtn.disabled = false;
  }
});
