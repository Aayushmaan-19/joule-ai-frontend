import {
  profileBtn,
  profileAvatar,
  profileOverlay,
  closeProfile,
  profileForm,
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
import { fetchProfile, updateProfile, uploadAvatarImage } from "../auth/profileService.js";
import { cropToSquare } from "../utils/imageCrop.js";
import { setProfile } from "../config/actions.js";
import { currentProfile } from "../config/selectors.js";
import { isDarkMode } from "../config/selectors.js";
import { isPlaying } from "../config/selectors.js";

const themeSwatches = document.querySelectorAll(".theme-swatch");
const profileSoundToggle = document.getElementById("profileSoundToggle");
const profileGalleryRow = document.getElementById("profileGalleryRow");

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

let selectedAvatar = DEFAULT_AVATAR;

/* =========================
   OPEN / CLOSE
========================= */

async function openProfile() {
  const user = auth.currentUser;

  if (!user) return;

  profileOverlay.classList.remove("hidden");
  profileEmail.value = user.email || "";

  hideStatus();

  const profile = await fetchProfile(user.uid);

  selectedAvatar = profile?.avatar || DEFAULT_AVATAR;
  profileName.value = profile?.displayName || "";

  setProfile(profile);

  updateAvatarPreview();
  highlightSelectedAvatar();
  updateSettingsUI();
}

function closeProfilePanel() {
  profileOverlay.classList.add("hidden");
}

profileBtn.addEventListener("click", openProfile);

closeProfile.addEventListener("click", closeProfilePanel);

profileOverlay.addEventListener("click", e => {
  if (e.target === profileOverlay) {
    closeProfilePanel();
  }
});

/* =========================
   SETTINGS (theme / sound / gallery)
   Every row here drives the same buttons and functions that already
   exist elsewhere (themeBtn, musicBtn, galleryToolBtn) rather than
   reimplementing their logic — this panel is just a second, more
   discoverable entry point to controls that were previously only
   reachable as small icon buttons.
========================= */

function updateSettingsUI() {
  themeSwatches.forEach(btn => {
    btn.classList.toggle("active", (btn.dataset.mode === "dark") === isDarkMode());
  });

  profileSoundToggle.classList.toggle("on", isPlaying());
  profileSoundToggle.setAttribute("aria-checked", String(isPlaying()));
}

themeSwatches.forEach(btn => {
  btn.addEventListener("click", () => {
    const wantsDark = btn.dataset.mode === "dark";
    if (wantsDark !== isDarkMode()) themeBtn.click();
    updateSettingsUI();
  });
});

profileSoundToggle.addEventListener("click", () => {
  musicBtn.click();
  // musicPlayer.js's own click handler runs synchronously, so state
  // is already current by the time this runs.
  updateSettingsUI();
});

profileGalleryRow.addEventListener("click", () => {
  closeProfilePanel();
  galleryToolBtn.click();
});

/* =========================
   AVATAR SELECTION
========================= */

function updateAvatarPreview() {
  profilePreviewImg.src = selectedAvatar;
}

function highlightSelectedAvatar() {
  const options = avatarGrid.querySelectorAll(".avatar-option[data-avatar]");
  const isUploaded = !Array.from(options).some(btn => btn.dataset.avatar === selectedAvatar);

  options.forEach(btn => {
    btn.classList.toggle(
      "selected",
      btn.dataset.avatar === selectedAvatar
    );
  });

  avatarUploadTile.classList.toggle("selected", isUploaded);
}

avatarGrid.addEventListener("click", e => {
  const option = e.target.closest(".avatar-option[data-avatar]");

  if (!option) return;

  selectedAvatar = option.dataset.avatar;

  updateAvatarPreview();
  highlightSelectedAvatar();
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
    profilePreviewImg.src = avatar;
    profileAvatar.src = avatar;

    setProfile({
      ...(currentProfile() || {}),
      avatar
    });

    highlightSelectedAvatar();
    showUploadStatus("Photo updated ✨");
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

function showStatus(message) {
  profileStatus.textContent = message;
  profileStatus.classList.remove("hidden");
}

function hideStatus() {
  profileStatus.textContent = "";
  profileStatus.classList.add("hidden");
}

profileForm.addEventListener("submit", async e => {
  e.preventDefault();

  const user = auth.currentUser;

  if (!user) return;

  const submitBtn = profileForm.querySelector(".continue-btn");

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const updated = {
      displayName: profileName.value.trim(),
      avatar: selectedAvatar
    };

    await updateProfile(user.uid, updated);

    profileAvatar.src = selectedAvatar;

    setProfile({
      ...(currentProfile() || {}),
      ...updated
    });

    showStatus("Profile updated ✨");
  } catch (err) {
    console.error(err);
    showStatus("Couldn't save changes");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save changes";
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
