import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import { openAuth, openLogin, profileBtn, profileAvatar } from "../utils/dom.js";
import { setUser, setProfile, setPrivateMode } from "../config/actions.js";
import { syncProfileAvatar } from "../ui/profileManager.js";
import { initSidebar, destroySidebar, toggle as toggleSidebar } from "../ui/sidebar.js";
import { saveCurrentSession } from "../chat/chatHistory.js";
import { initPeopleSection, destroyPeopleSection } from "../social/peopleSection.js";

const sidebarOpenBtn = document.getElementById("sidebarOpenBtn");

const DEFAULT_AVATAR = "Assets/Avatars/avatar1.png";

export function initializeAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("✅ Logged in:", user.email);

      const token = await user.getIdToken();

      localStorage.setItem("firebaseToken", token);

      document.body.classList.add("authenticated");
      document.body.classList.toggle("verified", user.emailVerified);

      setUser({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      });

      openAuth.classList.add("hidden");
      openLogin.classList.add("hidden");
      profileBtn.classList.remove("hidden");

      // Avatar sync is cosmetic; sidebar init below is not. A failure
      // here (e.g. a Firestore rules issue) must not be allowed to
      // block the sidebar — these are two separate responsibilities.
      try {
        await syncProfileAvatar(user.uid);
      } catch (err) {
        console.error("Profile avatar sync failed:", err.message);
      }

      // Sidebar and People section: verified users only
      if (user.emailVerified) {
        initSidebar();
        if (sidebarOpenBtn) {
          sidebarOpenBtn.classList.remove("hidden");
          sidebarOpenBtn.onclick = toggleSidebar;
        }

        initPeopleSection();
      }

    } else {
      console.log("❌ Logged out");

      saveCurrentSession();

      setPrivateMode(false);
      document.body.classList.remove("private-mode");

      localStorage.removeItem("firebaseToken");

      document.body.classList.remove("authenticated");
      document.body.classList.remove("verified");

      setUser(null);
      setProfile(null);

      profileAvatar.src = DEFAULT_AVATAR;

      openAuth.classList.remove("hidden");
      openLogin.classList.remove("hidden");
      profileBtn.classList.add("hidden");

      destroySidebar();
      if (sidebarOpenBtn) sidebarOpenBtn.classList.add("hidden");

      destroyPeopleSection();
    }
  });
}
