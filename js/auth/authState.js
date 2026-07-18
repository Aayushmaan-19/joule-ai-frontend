import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import { openAuth, profileBtn, profileAvatar } from "../utils/dom.js";
import { setUser, setProfile, setPrivateMode } from "../config/actions.js";
import { syncProfileAvatar } from "../ui/profileManager.js";
import { initSidebar, destroySidebar, toggle as toggleSidebar } from "../ui/sidebar.js";
import { saveCurrentSession } from "../chat/chatHistory.js";

const sidebarOpenBtn = document.getElementById("sidebarOpenBtn");

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

export function initializeAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("✅ Logged in:", user.email);

      const token = await user.getIdToken();

      localStorage.setItem("firebaseToken", token);

      document.body.classList.add("authenticated");

      setUser({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      });

      openAuth.classList.add("hidden");
      profileBtn.classList.remove("hidden");

      await syncProfileAvatar(user.uid);

      // Sidebar only for verified users
      if (user.emailVerified) {
        initSidebar();
        if (sidebarOpenBtn) {
          sidebarOpenBtn.classList.remove("hidden");
          sidebarOpenBtn.onclick = toggleSidebar;
        }
      }

    } else {
      console.log("❌ Logged out");

      saveCurrentSession();

      setPrivateMode(false);
      document.body.classList.remove("private-mode");

      localStorage.removeItem("firebaseToken");

      document.body.classList.remove("authenticated");

      setUser(null);
      setProfile(null);

      profileAvatar.src = DEFAULT_AVATAR;

      openAuth.classList.remove("hidden");
      profileBtn.classList.add("hidden");

      destroySidebar();
      if (sidebarOpenBtn) sidebarOpenBtn.classList.add("hidden");
    }
  });
}
