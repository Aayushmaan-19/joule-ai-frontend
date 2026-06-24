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
  profileStatus,
  logoutBtn
} from "../utils/dom.js";

import { auth } from "../auth/firebase.js";
import { logout } from "../auth/logout.js";
import { fetchProfile, updateProfile } from "../auth/profileService.js";
import { setProfile } from "../config/actions.js";
import { currentProfile } from "../config/selectors.js";

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
   AVATAR SELECTION
========================= */

function updateAvatarPreview() {
  profilePreviewImg.src = selectedAvatar;
}

function highlightSelectedAvatar() {
  const options = avatarGrid.querySelectorAll(".avatar-option");

  options.forEach(btn => {
    btn.classList.toggle(
      "selected",
      btn.dataset.avatar === selectedAvatar
    );
  });
}

avatarGrid.addEventListener("click", e => {
  const option = e.target.closest(".avatar-option");

  if (!option) return;

  selectedAvatar = option.dataset.avatar;

  updateAvatarPreview();
  highlightSelectedAvatar();
});

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
