import {
  openAuth,
  modalOverlay,
  closeModal,

  authView,
  authForm,
  authEmail,
  authPassword,
  authError,
  authTitle,
  authSubtitle,
  authSubmitBtn,
  authToggleBtn,
  authToggleText,

  togglePassword,
  eyeShape,
  eyePupil,

  otpView,
  otpForm,
  otpInputs,
  otpError,
  otpSuccess,
  otpSubmitBtn,
  otpResendBtn,
  otpEmailDisplay

} from "../utils/dom.js";

import { signup } from "../auth/signup.js";
import { login } from "../auth/login.js";
import { sendOtp } from "../auth/sendOtp.js";
import { verifyOtp } from "../auth/verifyOtp.js";
import { signInWithGoogle } from "../auth/googleAuth.js";

const authModal = modalOverlay.querySelector(".auth-modal");

let mode = "signup"; // "signup" | "login"
let resendCooldownUntil = 0;

/* =========================
   SMOOTH HEIGHT TRANSITION
   (height: auto can't be animated directly, so we measure
   pixel heights before/after and transition between them)
========================= */

function animateModalHeightTo(targetEl) {
  const startHeight = authModal.getBoundingClientRect().height;

  authModal.style.height = `${startHeight}px`;

  // Force layout so the browser registers the starting height
  // before we measure the target height in the next frame.
  void authModal.offsetHeight;

  requestAnimationFrame(() => {
    const endHeight = targetEl.scrollHeight;

    authModal.style.height = `${endHeight}px`;

    const onTransitionEnd = e => {
      if (e.propertyName !== "height") return;

      authModal.style.height = "";
      authModal.removeEventListener("transitionend", onTransitionEnd);
    };

    authModal.addEventListener("transitionend", onTransitionEnd);
  });
}

/* =========================
   MODAL OPEN / CLOSE
========================= */

function openModal() {
  modalOverlay.classList.remove("hidden");
  showAuthView();
}

function closeAuthModal() {
  modalOverlay.classList.add("hidden");

  // Snap back to the signup/login view instantly (no animation)
  // so the modal always reopens in a clean state.
  authModal.style.height = "";
  authView.classList.remove("hidden");
  otpView.classList.add("hidden");

  resetAuthForm();
}

openAuth.addEventListener("click", openModal);

closeModal.addEventListener("click", closeAuthModal);

modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) {
    closeAuthModal();
  }
});

/* =========================
   VIEW SWITCHING
========================= */

function switchView(fromEl, toEl) {
  toEl.classList.remove("hidden");

  // Temporarily make the incoming view invisible-but-measurable so
  // we can read its natural height before it's actually shown.
  toEl.style.position = "absolute";
  toEl.style.top = "42px";
  toEl.style.left = "42px";
  toEl.style.width = "calc(100% - 84px)";
  toEl.style.visibility = "hidden";
  toEl.style.pointerEvents = "none";

  animateModalHeightTo(toEl);

  requestAnimationFrame(() => {
    fromEl.classList.add("hidden");

    toEl.style.position = "";
    toEl.style.top = "";
    toEl.style.left = "";
    toEl.style.width = "";
    toEl.style.visibility = "";
    toEl.style.pointerEvents = "";
  });
}

function showAuthView() {
  if (otpView.classList.contains("hidden")) {
    authView.classList.remove("hidden");
    return;
  }

  switchView(otpView, authView);
}

function showOtpView(email) {
  otpEmailDisplay.textContent = email;

  clearOtpInputs();

  switchView(authView, otpView);

  focusFirstOtpBox();
}

function resetAuthForm() {
  authForm.reset();
  hideAuthError();
  setMode("signup");
  setPasswordVisible(false);
}

/* =========================
   SIGNUP / LOGIN TOGGLE
========================= */

function setMode(newMode) {
  mode = newMode;

  if (mode === "signup") {
    authTitle.textContent = "Welcome";
    authSubtitle.textContent = "Create your Joule account";
    authSubmitBtn.textContent = "Continue";
    authToggleText.textContent = "Already have an account?";
    authToggleBtn.textContent = "Log in";
  } else {
    authTitle.textContent = "Welcome back";
    authSubtitle.textContent = "Log in to your Joule account";
    authSubmitBtn.textContent = "Log in";
    authToggleText.textContent = "Don't have an account?";
    authToggleBtn.textContent = "Sign up";
  }

  hideAuthError();
}

authToggleBtn.addEventListener("click", () => {
  setMode(mode === "signup" ? "login" : "signup");
});

/* =========================
   AUTH FORM SUBMIT
========================= */

function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove("hidden");
}

function hideAuthError() {
  authError.textContent = "";
  authError.classList.add("hidden");
}

authForm.addEventListener("submit", async e => {
  e.preventDefault();

  hideAuthError();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    showAuthError("Please fill in both fields");
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = mode === "signup" ? "Creating account..." : "Logging in...";

  try {
    if (mode === "signup") {
      const result = await signup(email, password);

      if (!result.success) {
        showAuthError(result.error);
        return;
      }

      const otpResult = await sendOtp();

      if (!otpResult.success) {
        showAuthError(otpResult.message || "Couldn't send verification code");
        return;
      }

      showOtpView(email);

    } else {
      const result = await login(email, password);

      if (!result.success) {
        // login() fails with "verify your email first" if the
        // OTP step was never completed — send them back into it.
        if (result.error === "Please verify your email first.") {
          const otpResult = await sendOtp();

          if (otpResult.success) {
            showOtpView(email);
            return;
          }
        }

        showAuthError(result.error);
        return;
      }

      closeAuthModal();
    }
  } finally {
    authSubmitBtn.disabled = false;
    setMode(mode);
  }
});

/* =========================
   OTP INPUT BEHAVIOR
========================= */

const otpBoxes = Array.from(otpInputs.querySelectorAll(".otp-box"));

function clearOtpInputs() {
  otpBoxes.forEach(box => (box.value = ""));
  hideOtpError();
  hideOtpSuccess();
}

function focusFirstOtpBox() {
  if (otpBoxes[0]) {
    otpBoxes[0].focus();
  }
}

function getOtpValue() {
  return otpBoxes.map(box => box.value).join("");
}

otpBoxes.forEach((box, index) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);

    if (box.value && index < otpBoxes.length - 1) {
      otpBoxes[index + 1].focus();
    }
  });

  box.addEventListener("keydown", e => {
    if (e.key === "Backspace" && !box.value && index > 0) {
      otpBoxes[index - 1].focus();
    }
  });

  box.addEventListener("paste", e => {
    e.preventDefault();

    const pasted = (e.clipboardData.getData("text") || "")
      .replace(/[^0-9]/g, "")
      .slice(0, otpBoxes.length);

    pasted.split("").forEach((char, i) => {
      if (otpBoxes[i]) {
        otpBoxes[i].value = char;
      }
    });

    const nextEmpty = otpBoxes.findIndex(b => !b.value);
    (otpBoxes[nextEmpty] || otpBoxes[otpBoxes.length - 1]).focus();
  });
});

/* =========================
   OTP FORM SUBMIT
========================= */

function showOtpError(message) {
  otpError.textContent = message;
  otpError.classList.remove("hidden");
  otpSuccess.classList.add("hidden");
}

function hideOtpError() {
  otpError.textContent = "";
  otpError.classList.add("hidden");
}

function showOtpSuccess(message) {
  otpSuccess.textContent = message;
  otpSuccess.classList.remove("hidden");
  otpError.classList.add("hidden");
}

function hideOtpSuccess() {
  otpSuccess.textContent = "";
  otpSuccess.classList.add("hidden");
}

otpForm.addEventListener("submit", async e => {
  e.preventDefault();

  hideOtpError();
  hideOtpSuccess();

  const code = getOtpValue();

  if (code.length !== 6) {
    showOtpError("Enter all 6 digits");
    return;
  }

  otpSubmitBtn.disabled = true;
  otpSubmitBtn.textContent = "Verifying...";

  try {
    const result = await verifyOtp(code);

    if (!result.success) {
      showOtpError(result.message || "Incorrect code");
      return;
    }

    showOtpSuccess("Email verified! You're all set ⚡");

    setTimeout(() => {
      closeAuthModal();
    }, 1200);

  } catch (err) {
    showOtpError("Something went wrong. Try again.");
  } finally {
    otpSubmitBtn.disabled = false;
    otpSubmitBtn.textContent = "Verify";
  }
});

/* =========================
   RESEND CODE
========================= */

otpResendBtn.addEventListener("click", async () => {
  if (Date.now() < resendCooldownUntil) {
    return;
  }

  hideOtpError();
  hideOtpSuccess();

  otpResendBtn.disabled = true;

  try {
    const result = await sendOtp();

    if (!result.success) {
      if (result.retryAfterMs) {
        resendCooldownUntil = Date.now() + result.retryAfterMs;
        startResendCooldown(Math.ceil(result.retryAfterMs / 1000));
      } else {
        showOtpError(result.message || "Couldn't resend code");
      }
      return;
    }

    showOtpSuccess("New code sent");

    resendCooldownUntil = Date.now() + 60000;
    startResendCooldown(60);

  } finally {
    otpResendBtn.disabled = false;
  }
});

function startResendCooldown(seconds) {
  let remaining = seconds;
  otpResendBtn.disabled = true;
  otpResendBtn.textContent = `Resend in ${remaining}s`;

  const interval = setInterval(() => {
    remaining -= 1;

    if (remaining <= 0) {
      clearInterval(interval);
      otpResendBtn.disabled = false;
      otpResendBtn.textContent = "Resend code";
      return;
    }

    otpResendBtn.textContent = `Resend in ${remaining}s`;
  }, 1000);
}

/* =========================
   GOOGLE SIGN-IN
========================= */

const googleBtn = modalOverlay.querySelector(".google-btn");

googleBtn.addEventListener("click", async () => {
  hideAuthError();

  googleBtn.disabled = true;
  googleBtn.textContent = "Signing in...";

  try {
    const result = await signInWithGoogle();

    if (!result.success) {
      showAuthError(result.error || "Google sign-in failed");
      return;
    }

    closeAuthModal();

  } catch (err) {
    // User closed the popup — not an error worth showing
    if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
      showAuthError("Google sign-in failed. Try again.");
    }
  } finally {
    googleBtn.disabled = false;
    googleBtn.textContent = "Continue with Google";
  }
});

/* =========================
   PASSWORD SHOW / HIDE TOGGLE
========================= */

const EYE_OPEN_PATH =
  "M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z";

const EYE_CLOSED_PATH =
  "M3 3l18 18M10.6 10.6a3.2 3.2 0 0 0 4.53 4.53M7.36 7.4C4.5 9.1 2.5 12 2.5 12s4 7.5 10.5 7.5c1.8 0 3.4-.43 4.78-1.1M17.3 17.3C19.9 15.6 21.5 12 21.5 12s-1.62-3.04-4.4-5.05A11.8 11.8 0 0 0 12 5c-.9 0-1.77.1-2.6.28";

let passwordVisible = false;

function setPasswordVisible(visible) {
  passwordVisible = visible;

  authPassword.type = visible ? "text" : "password";

  eyeShape.setAttribute("d", visible ? EYE_CLOSED_PATH : EYE_OPEN_PATH);
  eyePupil.style.display = visible ? "none" : "";

  togglePassword.setAttribute(
    "aria-label",
    visible ? "Hide password" : "Show password"
  );
}

togglePassword.addEventListener("click", () => {
  setPasswordVisible(!passwordVisible);
});

/* =========================
   PUBLIC: open verification flow directly
========================= */

export function openVerificationFlow(email) {
  modalOverlay.classList.remove("hidden");
  showOtpView(email);
}
