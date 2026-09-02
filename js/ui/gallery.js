import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
  galleryToolBtn,
  galleryOverlay,
  closeGallery,
  galleryGrid,
  toolsMenu,
  toolsBtn
} from "../utils/dom.js";
import { auth, db } from "../auth/firebase.js";
import { getToken } from "../auth/getToken.js";
import { escHtml } from "../utils/helpers.js";
import { GALLERY_API_URL } from "../utils/constants.js";

let stopGallery = null;

function closeToolsMenu() {
  toolsMenu.classList.add("hidden");
  toolsBtn.classList.remove("open");
  toolsBtn.setAttribute("aria-expanded", "false");
}

function openGallery() {
  const user = auth.currentUser;
  if (!user) return;

  closeToolsMenu();
  galleryOverlay.classList.remove("hidden");
  galleryGrid.innerHTML = `<div class="gallery-loading">Loading your images…</div>`;

  const q = query(
    collection(db, "users", user.uid, "images"),
    orderBy("createdAt", "desc")
  );

  if (stopGallery) stopGallery();
  stopGallery = onSnapshot(q, snap => {
    const images = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGallery(images);
  });
}

function closeGalleryPanel() {
  galleryOverlay.classList.add("hidden");

  if (stopGallery) stopGallery();
  stopGallery = null;
}

function renderGallery(images) {
  if (images.length === 0) {
    galleryGrid.innerHTML = `<div class="gallery-empty">No images yet — anything you generate is saved here.</div>`;
    return;
  }

  galleryGrid.innerHTML = images
    .map(
      img => `
        <div class="gallery-item" data-image-id="${escHtml(img.id)}">
          <img class="gallery-item-img" src="${escHtml(img.url)}" alt="${escHtml(img.prompt || "")}" loading="lazy" />
          <div class="gallery-item-overlay">
            <p class="gallery-item-prompt">${escHtml(img.prompt || "")}</p>
            <div class="gallery-item-actions">
              <button type="button" class="gallery-item-btn gallery-download-btn" aria-label="Download">
                <img src="Assets/Icons/download.svg" class="icon" alt="" />
              </button>
              <button type="button" class="gallery-item-btn gallery-delete-btn" aria-label="Delete">
                <img src="Assets/Icons/trash.svg" class="icon" alt="" />
              </button>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

async function downloadImage(url, imageId) {
  // A plain <a download> doesn't reliably force a download for a
  // cross-origin Storage URL (browsers tend to just navigate to it
  // instead), so the image is fetched and saved from a same-origin
  // blob URL instead — same reasoning as the download button on
  // freshly generated images in sendImage.js.
  const response = await fetch(url);
  const blob = await response.blob();
  const extension = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `joule-image-${imageId}.${extension}`;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

async function deleteImage(imageId, itemEl) {
  itemEl.classList.add("gallery-item-deleting");

  try {
    const token = await getToken();

    const response = await fetch(`${GALLERY_API_URL}/${imageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Delete failed");
    // No manual DOM removal needed — the onSnapshot listener above
    // fires again once the Firestore doc is gone and re-renders.
  } catch (err) {
    console.error("Gallery delete failed:", err);
    itemEl.classList.remove("gallery-item-deleting");
  }
}

galleryToolBtn.addEventListener("click", openGallery);

closeGallery.addEventListener("click", closeGalleryPanel);

galleryOverlay.addEventListener("click", e => {
  if (e.target === galleryOverlay) {
    closeGalleryPanel();
  }
});

galleryGrid.addEventListener("click", e => {
  const item = e.target.closest(".gallery-item[data-image-id]");
  if (!item) return;

  const imageId = item.dataset.imageId;

  if (e.target.closest(".gallery-download-btn")) {
    const url = item.querySelector(".gallery-item-img").src;
    downloadImage(url, imageId);
  } else if (e.target.closest(".gallery-delete-btn")) {
    deleteImage(imageId, item);
  }
});
