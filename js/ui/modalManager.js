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

import { requestSignupOtp, verifySignupOtp } from "../auth/signup.js";
import { login } from "../auth/login.js";
import { sendOtp } from "../auth/sendOtp.js";
import { verifyOtp } from "../auth/verifyOtp.js";
import { signInWithGoogle } from "../auth/googleAuth.js";

const authModal = modalOverlay.querySelector(".auth-modal");

let mode = "signup";
let resendCooldownUntil = 0;

// Tracks which OTP flow is currently open in otpView:
// "signup" = no Firebase account exists yet, verifying creates one
// "existing" = an unverified Firebase account already exists (e.g. Google sign-in)
let otpFlow = "signup";
let pendingSignupEmail = "";
let pendingSignupPassword = "";

/* =========================
   PASSWORD REQUIREMENTS UI
========================= */

// Rules: [id, label, test function]
const PW_RULES = [
  ["pw-req-upper",   "Uppercase letter",   v => /[A-Z]/.test(v)],
  ["pw-req-lower",   "Lowercase letter",   v => /[a-z]/.test(v)],
  ["pw-req-number",  "Number",             v => /[0-9]/.test(v)],
  ["pw-req-special", "Special character",  v => /[^A-Za-z0-9]/.test(v)],
  ["pw-req-length",  "At least 6 characters", v => v.length >= 6]
];

// Inject requirements block right after password-field in the DOM
function buildPasswordRequirements() {
  let container = document.getElementById("pw-requirements");
  if (container) return container;

  container = document.createElement("div");
  container.id = "pw-requirements";
  container.className = "pw-requirements hidden";
  container.innerHTML = PW_RULES.map(([id, label]) => `
    <div class="pw-req-item" id="${id}">
      <span class="pw-req-icon">
        <svg class="pw-icon pw-icon-cross" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <svg class="pw-icon pw-icon-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      </span>
      <span class="pw-req-label">${label}</span>
    </div>
  `).join("");

  const passwordField = authPassword.closest(".password-field");
  passwordField.insertAdjacentElement("afterend", container);

  return container;
}

function updatePasswordRequirements(value) {
  for (const [id, , test] of PW_RULES) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle("pw-req-met", test(value));
  }
}

function showPasswordRequirements() {
  const container = document.getElementById("pw-requirements");
  if (container) container.classList.remove("hidden");
}

function hidePasswordRequirements() {
  const container = document.getElementById("pw-requirements");
  if (container) container.classList.add("hidden");
}

// Wire password field events
authPassword.addEventListener("input", () => {
  updatePasswordRequirements(authPassword.value);
});

authPassword.addEventListener("focus", () => {
  if (mode === "signup") showPasswordRequirements();
});

authPassword.addEventListener("blur", () => {
  // Keep visible if there are unmet rules and field has content
  const allMet = PW_RULES.every(([, , test]) => test(authPassword.value));
  if (allMet || authPassword.value.length === 0) {
    hidePasswordRequirements();
  }
});

/* =========================
   SMOOTH HEIGHT TRANSITION
========================= */

function animateModalHeightTo(targetEl) {
  const startHeight = authModal.getBoundingClientRect().height;

  authModal.style.height = `${startHeight}px`;

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

export function openModal() {
  modalOverlay.classList.remove("hidden");
  showAuthView();
  buildPasswordRequirements();
}

function closeAuthModal() {
  // No account exists until OTP verification succeeds, so there's
  // nothing to clean up here — closing mid-OTP simply abandons the
  // pending signup (the OTP record expires server-side on its own).
  pendingSignupEmail = "";
  pendingSignupPassword = "";

  modalOverlay.classList.add("hidden");
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

/* =========================
   SIGNUP / LOGIN TOGGLE
========================= */

function resetAuthForm() {
  authForm.reset();
  hideAuthError();
  setMode("signup");
  setPasswordVisible(false);
  hidePasswordRequirements();
  updatePasswordRequirements("");
}

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
    // Hide requirements in login mode
    hidePasswordRequirements();
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

  // On signup, validate all requirements are met before submitting
  if (mode === "signup") {
    const unmet = PW_RULES.filter(([, , test]) => !test(password));
    if (unmet.length > 0) {
      showPasswordRequirements();
      showAuthError("Please meet all password requirements");
      return;
    }
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = mode === "signup" ? "Sending code..." : "Logging in...";

  try {
    if (mode === "signup") {
      const otpResult = await requestSignupOtp(email, password);

      if (!otpResult.success) {
        showAuthError(otpResult.error);
        return;
      }

      pendingSignupEmail = email;
      pendingSignupPassword = password;
      otpFlow = "signup";
      showOtpView(email);

    } else {
      const result = await login(email, password);

      if (!result.success) {
        if (result.error === "Please verify your email first.") {
          const otpResult = await sendOtp();

          if (otpResult.success) {
            otpFlow = "existing";
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
    const result =
      otpFlow === "signup"
        ? await verifySignupOtp(pendingSignupEmail, code)
        : await verifyOtp(code);

    if (!result.success) {
      showOtpError(result.message || "Incorrect code");
      return;
    }

    showOtpSuccess("Email verified! You're all set ⚡");
    pendingSignupEmail = "";
    pendingSignupPassword = "";

    // signInWithCustomToken (signup flow) or the existing emailVerified
    // flip (existing flow) both fire Firebase's onAuthStateChanged,
    // which authState.js already listens to — it sets up the profile
    // button and builds the sidebar (closed, not auto-opened) on its own.
    // No manual sidebar wiring needed here.
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
    const result =
      otpFlow === "signup"
        ? await requestSignupOtp(pendingSignupEmail, pendingSignupPassword)
        : await sendOtp();

    if (!result.success) {
      if (result.retryAfterMs) {
        resendCooldownUntil = Date.now() + result.retryAfterMs;
        startResendCooldown(Math.ceil(result.retryAfterMs / 1000));
      } else {
        showOtpError(result.error || result.message || "Couldn't resend code");
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
  buildPasswordRequirements();
  otpFlow = "existing";
  showOtpView(email);
}