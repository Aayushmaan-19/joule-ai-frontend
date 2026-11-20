import {
  profileBtn,
  profileAvatar,
  profileOverlay,
  closeProfile,
  profileForm,
  profileUsername,
  profileName,
  profileEmail,
  profilePreviewImg,
  avatarGrid,
  avatarUploadTile,
  avatarFileInput,
  avatarUploadSpinner,
  avatarUploadStatus,
  profileStatus,
  logoutBtn,
  themeBtn,
  musicBtn,
  galleryToolBtn
} from "../utils/dom.js";

import { auth } from "../auth/firebase.js";
import { logout } from "../auth/logout.js";
import { fetchProfile, updateProfile, uploadAvatarImage, setUsername } from "../auth/profileService.js";
import { cropToSquare } from "../utils/imageCrop.js";
import { setProfile } from "../config/actions.js";
import { currentProfile } from "../config/selectors.js";
import { isDarkMode } from "../config/selectors.js";
import { navigate } from "./router.js";

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

// Same rule the backend enforces (Backend/Services/userIdentity.js).
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const $ = id => document.getElementById(id);

const pfName = $("pfName");
const pfHandle = $("pfHandle");
const pfVerified = $("pfVerified");
const pfUsernameMsg = $("pfUsernameMsg");
const pfNameCount = $("pfNameCount");
const pfSave = $("pfSave");
const pfDiscard = $("pfDiscard");
const pfUsage = $("pfUsage");
const pfUsageFill = $("pfUsageFill");
const pfUsageText = $("pfUsageText");
const themeButtons = document.querySelectorAll(".pf-seg-btn");
const profileMusicRow = $("profileMusicRow");
const profileGalleryRow = $("profileGalleryRow");

const USERNAME_HINT = pfUsernameMsg.textContent;

/** What is stored on the server right now — the form is "dirty" when it differs. */
let saved = { username: "", displayName: "", avatar: DEFAULT_AVATAR };
let selectedAvatar = DEFAULT_AVATAR;
let statusTimer = null;

function toSaved(profile) {
  return {
    username: profile?.username || "",
    displayName: profile?.displayName || "",
    avatar: profile?.avatar || DEFAULT_AVATAR
  };
}

/* =========================
   OPEN / CLOSE
========================= */

export async function openProfile() {
  const user = auth.currentUser;

  if (!user) return;

  navigate("/profile");

  profileOverlay.classList.remove("hidden");
  profileEmail.value = user.email || "";
  pfVerified.classList.toggle("hidden", !user.emailVerified);

  hideStatus();
  renderUsage();

  // Paint what login already loaded right away (empty after a logout), then
  // refresh from the server — never another person's leftovers.
  saved = toSaved(currentProfile());
  resetForm();

  const profile = await fetchProfile(user.uid);

  saved = toSaved(profile);
  resetForm();

  setProfile(profile);

  updateThemeButtons();
  closeProfile.focus({ preventScroll: true });
}

export function closeProfilePanel() {
  profileOverlay.classList.add("hidden");
  navigate("/chat");
}

/** A person closing the panel by hand (×, backdrop, Esc) must not silently lose edits. */
function requestClose() {
  if (isDirty()) {
    showStatus("You have unsaved changes — save or discard them first.", true);
    return;
  }
  closeProfilePanel();
}

profileBtn.addEventListener("click", openProfile);

closeProfile.addEventListener("click", requestClose);

profileOverlay.addEventListener("click", e => {
  if (e.target === profileOverlay) requestClose();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !profileOverlay.classList.contains("hidden")) requestClose();
});

/* =========================
   FORM STATE
   One function decides everything the form shows, so the hero, the
   counters, the validation message and the Save/Discard buttons can
   never disagree with each other.
========================= */

function formValues() {
  return {
    username: profileUsername.value,
    displayName: profileName.value.trim(),
    avatar: selectedAvatar
  };
}

function isDirty() {
  const now = formValues();
  return (
    now.username !== saved.username ||
    now.displayName !== saved.displayName ||
    now.avatar !== saved.avatar
  );
}

/** "" when the username is fine to save, otherwise what to tell the person. */
function usernameProblem() {
  const value = profileUsername.value;

  if (value === saved.username) return "";
  if (value === "") return "A username can't be removed once it's set.";
  if (!USERNAME_PATTERN.test(value)) return "Use 3–20 lowercase letters, numbers or _.";
  return "";
}

function refresh() {
  const problem = usernameProblem();
  const dirty = isDirty();

  pfUsernameMsg.textContent = problem || USERNAME_HINT;
  pfUsernameMsg.classList.toggle("pf-msg-error", Boolean(problem));
  profileUsername.setAttribute("aria-invalid", problem ? "true" : "false");

  pfNameCount.textContent = `${profileName.value.length}/${profileName.maxLength}`;

  pfSave.disabled = !dirty || Boolean(problem);
  pfDiscard.disabled = !dirty;
}

function renderHero() {
  const user = auth.currentUser;
  const fallback = user?.email?.split("@")[0] || "Your profile";

  pfName.textContent = saved.displayName || saved.username || fallback;
  pfHandle.textContent = saved.username ? `@${saved.username}` : "No username yet";
  profilePreviewImg.src = selectedAvatar;
}

function resetForm() {
  profileUsername.value = saved.username;
  profileName.value = saved.displayName;
  selectedAvatar = saved.avatar;

  highlightSelectedAvatar();
  renderHero();
  refresh();
}

profileUsername.addEventListener("input", () => {
  const cleaned = profileUsername.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (cleaned !== profileUsername.value) profileUsername.value = cleaned;
  hideStatus();
  refresh();
});

profileName.addEventListener("input", () => {
  hideStatus();
  refresh();
});

pfDiscard.addEventListener("click", () => {
  hideStatus();
  resetForm();
});

/* =========================
   SETTINGS (theme / music / gallery)
   Every row drives the same buttons and functions that already exist
   elsewhere (themeBtn, musicBtn, galleryToolBtn) rather than
   reimplementing their logic — this panel is a second, more
   discoverable entry point to controls that were previously only
   reachable as small icon buttons.
========================= */

function updateThemeButtons() {
  themeButtons.forEach(btn => {
    const active = (btn.dataset.mode === "dark") === isDarkMode();
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

themeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const wantsDark = btn.dataset.mode === "dark";
    if (wantsDark !== isDarkMode()) themeBtn.click();
    updateThemeButtons();
  });
});

profileMusicRow.addEventListener("click", () => {
  closeProfilePanel();
  musicBtn.click();
});

profileGalleryRow.addEventListener("click", () => {
  closeProfilePanel();
  galleryToolBtn.click();
});

/* =========================
   USAGE
   Same event the sidebar meter listens to: the numbers come from the
   X-Remaining / X-Limit headers on chat replies, so this section
   appears after the first reply of a session.
========================= */

let lastUsage = null;

window.addEventListener("joule:usage", e => {
  lastUsage = e.detail;
  renderUsage();
});

function renderUsage() {
  if (!lastUsage) return;

  const { remaining, limit } = lastUsage;

  pfUsage.classList.remove("hidden");
  pfUsageText.textContent = `${remaining} of ${limit} messages left today`;
  pfUsageFill.style.width = `${Math.max(0, Math.min(100, (remaining / limit) * 100))}%`;
}

/* =========================
   AVATAR SELECTION
========================= */

function highlightSelectedAvatar() {
  avatarGrid.querySelectorAll(".pf-avatar-opt").forEach(btn => {
    const selected = btn.dataset.avatar === selectedAvatar;
    btn.classList.toggle("selected", selected);
    btn.setAttribute("aria-pressed", String(selected));
  });
}

avatarGrid.addEventListener("click", e => {
  const option = e.target.closest(".pf-avatar-opt");

  if (!option) return;

  selectedAvatar = option.dataset.avatar;

  hideStatus();
  profilePreviewImg.src = selectedAvatar;
  highlightSelectedAvatar();
  refresh();
});

/* =========================
   AVATAR UPLOAD
   Auto-crops to a centered square client-side (imageCrop.js), then
   uploads. Unlike the preset picker above (which only takes effect
   once "Save changes" is pressed), an uploaded photo saves itself
   immediately on success — picking and cropping a photo is already a
   complete, deliberate action, so there's no reason to make it wait
   on a second explicit save step.
========================= */

avatarUploadTile.addEventListener("click", () => {
  avatarFileInput.click();
});

avatarFileInput.addEventListener("change", async () => {
  const file = avatarFileInput.files?.[0];
  avatarFileInput.value = ""; // allow re-selecting the same file later

  if (!file) return;

  const user = auth.currentUser;
  if (!user) return;

  const previousAvatar = selectedAvatar;
  hideUploadStatus();
  avatarUploadSpinner.classList.remove("hidden");

  try {
    const croppedBlob = await cropToSquare(file);

    // Instant local preview — don't wait on the upload to show it.
    const localPreviewUrl = URL.createObjectURL(croppedBlob);
    profilePreviewImg.src = localPreviewUrl;

    const { avatar } = await uploadAvatarImage(croppedBlob);
    URL.revokeObjectURL(localPreviewUrl);

    selectedAvatar = avatar;
    saved.avatar = avatar;
    profilePreviewImg.src = avatar;
    profileAvatar.src = avatar;

    setProfile({
      ...(currentProfile() || {}),
      avatar
    });

    highlightSelectedAvatar();
    refresh();
    showUploadStatus("Photo updated");
  } catch (err) {
    console.error("Avatar upload failed:", err);
    selectedAvatar = previousAvatar;
    profilePreviewImg.src = previousAvatar;
    showUploadStatus(err.message || "Couldn't upload that photo.");
  } finally {
    avatarUploadSpinner.classList.add("hidden");
  }
});

function showUploadStatus(message) {
  avatarUploadStatus.textContent = message;
  avatarUploadStatus.classList.remove("hidden");
  setTimeout(hideUploadStatus, 3000);
}

function hideUploadStatus() {
  avatarUploadStatus.textContent = "";
  avatarUploadStatus.classList.add("hidden");
}

/* =========================
   SAVE PROFILE
========================= */

function showStatus(message, isError = false) {
  clearTimeout(statusTimer);
  profileStatus.textContent = message;
  profileStatus.classList.toggle("pf-status-error", isError);
  profileStatus.classList.remove("hidden");

  if (!isError) statusTimer = setTimeout(hideStatus, 3000);
}

function hideStatus() {
  clearTimeout(statusTimer);
  profileStatus.textContent = "";
  profileStatus.classList.add("hidden");
}

profileForm.addEventListener("submit", async e => {
  e.preventDefault();

  const user = auth.currentUser;

  if (!user || pfSave.disabled) return;

  pfSave.disabled = true;
  pfDiscard.disabled = true;
  pfSave.textContent = "Saving...";

  try {
    const next = formValues();

    if (next.username !== saved.username) {
      await setUsername(next.username);
      saved.username = next.username;
      setProfile({ ...(currentProfile() || {}), username: next.username });
    }

    const updated = { displayName: next.displayName, avatar: next.avatar };

    await updateProfile(user.uid, updated);

    saved = { ...saved, ...updated };
    profileAvatar.src = saved.avatar;

    setProfile({
      ...(currentProfile() || {}),
      ...updated
    });

    renderHero();
    showStatus("Profile updated");
  } catch (err) {
    console.error(err);
    showStatus(err.message || "Couldn't save changes", true);
  } finally {
    pfSave.textContent = "Save changes";
    refresh();
  }
});

/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener("click", async () => {
  await logout();

  closeProfilePanel();
});

/* =========================
   SYNC NAVBAR AVATAR ON LOGIN
========================= */

export async function syncProfileAvatar(uid) {
  const profile = await fetchProfile(uid);

  profileAvatar.src = profile?.avatar || DEFAULT_AVATAR;

  setProfile(profile);
}
