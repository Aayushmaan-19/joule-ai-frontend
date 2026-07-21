/* =========================
   LEGAL MODAL
   Handles popup overlays for Privacy Policy, Terms of Service,
   About Us, and Contact — no page redirects.
========================= */

const LEGAL_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    icon: "🔒",
    lastUpdated: "July 2026",
    sections: [
      {
        heading: "Overview",
        body: `Joule AI ("we", "our", "us") is committed to protecting your privacy. This policy explains what data we collect, why we collect it, and how we handle it. By using Joule AI, you agree to the practices described here.`
      },
      {
        heading: "Information We Collect",
        body: `<strong>Account data:</strong> When you sign up, we collect your email address and a securely hashed password via Firebase Authentication. We do not store plaintext passwords.<br><br>
        <strong>Profile data:</strong> Display name and avatar preference you choose — stored in Firestore under your user ID.<br><br>
        <strong>Chat history:</strong> Conversations are stored locally in your browser (localStorage) and are never uploaded to our servers unless explicitly saved to your account.<br><br>
        <strong>Usage data:</strong> We track daily message counts (per IP for guests, per UID for signed-in users) solely to enforce fair usage limits. This data resets daily and is not used for profiling.`
      },
      {
        heading: "How We Use Your Data",
        body: `We use your data exclusively to:<br><br>
        • Authenticate your identity and secure your account<br>
        • Send OTP verification codes to your email<br>
        • Personalize your experience (name, avatar)<br>
        • Enforce usage limits fairly across all users<br><br>
        We do not sell, rent, or share your personal data with third parties for marketing purposes.`
      },
      {
        heading: "Third-Party Services",
        body: `Joule AI integrates with the following services, each with their own privacy policies:<br><br>
        • <strong>Firebase (Google)</strong> — Authentication and database<br>
        • <strong>Groq</strong> — AI inference engine (your messages are processed by Groq's servers)<br>
        • <strong>Brevo</strong> — Transactional email delivery for OTP codes<br><br>
        Message content sent to Groq is governed by Groq's privacy policy. We recommend not sharing sensitive personal information in chat messages. Text-to-speech runs entirely on your own device via your browser's built-in speech synthesis — no message text is sent anywhere for this.`
      },
      {
        heading: "Data Retention & Deletion",
        body: `OTP codes are deleted immediately after successful verification or expiry (10 minutes). Daily usage counters reset at midnight UTC. You may delete your account by contacting us — all associated Firestore data will be permanently removed within 7 days.`
      },
      {
        heading: "Security",
        body: `We employ industry-standard measures including HTTPS encryption, Firebase Security Rules, helmet.js HTTP hardening, and token-based authentication. However, no system is 100% secure — use a strong unique password.`
      },
      {
        heading: "Contact",
        body: `Questions about this policy? Reach us at <strong>privacy@joule-ai.com</strong>`
      }
    ]
  },

  terms: {
    title: "Terms of Service",
    icon: "📋",
    lastUpdated: "July 2026",
    sections: [
      {
        heading: "Agreement",
        body: `By accessing or using Joule AI ("the Service"), you agree to be bound by these Terms. If you do not agree, please do not use the Service. We reserve the right to modify these Terms at any time.`
      },
      {
        heading: "Eligibility",
        body: `You must be at least 13 years old to use Joule AI. By creating an account, you confirm that all information you provide is accurate and that you are authorized to enter this agreement.`
      },
      {
        heading: "Permitted Use",
        body: `Joule AI is provided for personal, non-commercial use. You may:<br><br>
        • Use the AI chat interface for information, assistance, and creative tasks<br>
        • Use voice input and text-to-speech features<br>
        • Save and manage your own chat history<br><br>
        You may <strong>not</strong>:<br><br>
        • Attempt to reverse-engineer, scrape, or abuse the API<br>
        • Use the Service to generate illegal, harmful, or abusive content<br>
        • Circumvent usage limits through automated requests or multiple accounts<br>
        • Impersonate other users or represent yourself as Joule AI staff`
      },
      {
        heading: "Usage Limits",
        body: `To ensure fair access for all users, daily usage limits apply:<br><br>
        • <strong>Guest users:</strong> Limited messages per day (tracked by IP address)<br>
        • <strong>Verified accounts:</strong> Higher daily limits (tracked by user ID)<br><br>
        Limits reset at midnight UTC. We may adjust these limits at our discretion.`
      },
      {
        heading: "AI-Generated Content",
        body: `Joule AI uses third-party AI models (Groq) to generate responses. These responses are automated and may contain errors, inaccuracies, or outdated information. Do not rely on Joule AI for medical, legal, financial, or safety-critical decisions. Always verify important information from authoritative sources.`
      },
      {
        heading: "Intellectual Property",
        body: `Joule AI, its branding, design, code, and content are owned by Aayushmaan and protected by applicable intellectual property laws. You retain ownership of content you create, but grant us a limited license to process it to provide the Service.`
      },
      {
        heading: "Disclaimer & Limitation of Liability",
        body: `The Service is provided "as is" without warranties of any kind. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.`
      },
      {
        heading: "Termination",
        body: `We reserve the right to suspend or terminate accounts that violate these Terms, without prior notice. You may delete your account at any time via the profile panel.`
      },
      {
        heading: "Contact",
        body: `For questions about these Terms, contact us at <strong>legal@joule-ai.com</strong>`
      }
    ]
  },

  about: {
    title: "About Joule AI",
    icon: "⚡",
    lastUpdated: null,
    sections: [
      {
        heading: "What is Joule AI?",
        body: `Joule AI is a full-stack AI chat application built independently by <strong>Aayushmaan</strong> — a developer with a passion for cinematic, personality-driven software experiences. It combines a powerful AI backbone with a carefully crafted aesthetic, right down to the dual-theme system including the iconic <em>Shinigami Mode</em>.`
      },
      {
        heading: "The Technology",
        body: `Joule AI is built on a modern, production-grade stack:<br><br>
        • <strong>Frontend:</strong> Vite + Vanilla JS — fast, minimal, no framework overhead<br>
        • <strong>Backend:</strong> Node.js + Express, deployed on Render<br>
        • <strong>AI Engine:</strong> Groq (lightning-fast inference)<br>
        • <strong>Auth:</strong> Firebase Authentication + Firestore<br>
        • <strong>Voice:</strong> Browser-native Speech Synthesis for TTS + Web Speech API for microphone input<br>
        • <strong>Email:</strong> Brevo for OTP verification<br>
        • <strong>Deployment:</strong> Vercel (frontend) + Render (backend)`
      },
      {
        heading: "Design Philosophy",
        body: `Every pixel in Joule AI is intentional. The default theme features an aurora-inspired palette with cloud and mountain textures. Shinigami Mode transforms the entire UI into a dark, cinematic horror aesthetic — red glows, dark backgrounds, and a different AI voice to match the vibe.<br><br>
        The loading screen features a custom physics-based aurora canvas animation. The logo draws itself. Even the founder's signature drops in from the top. This is software that <em>feels</em> alive.`
      },
      {
        heading: "Built With Care",
        body: `Joule AI is a solo project built from the ground up — no templates, no boilerplates. Every feature, from the OTP verification system to the chat history sidebar, was designed and implemented by hand. It's the product of many late nights and an obsession with getting the details right.`
      },
      {
        heading: "Version",
        body: `Joule AI v1.0 — July 2026<br>Actively maintained and improved.`
      }
    ]
  },

  contact: {
    title: "Contact Us",
    icon: "✉️",
    lastUpdated: null,
    sections: [
      {
        heading: "Get in Touch",
        body: `We'd love to hear from you — whether it's a bug report, a feature request, or just a message to say hello. Joule AI is a passion project, so every piece of feedback genuinely matters.`
      },
      {
        heading: "General Enquiries",
        body: `📧 <strong>hello@joule-ai.com</strong><br><br>Response time: typically within 24–48 hours.`
      },
      {
        heading: "Bug Reports & Technical Issues",
        body: `Found a bug? Please describe:<br><br>
        • What you were doing when it happened<br>
        • What you expected vs. what actually occurred<br>
        • Your browser and device (if relevant)<br><br>
        📧 <strong>bugs@joule-ai.com</strong>`
      },
      {
        heading: "Privacy & Account",
        body: `For account deletion requests, data removal, or privacy concerns:<br><br>
        📧 <strong>privacy@joule-ai.com</strong><br><br>
        We handle all data requests within 7 business days.`
      },
      {
        heading: "Follow the Journey",
        body: `Joule AI is actively developed. Watch the project evolve on GitHub — contributions, issues, and stars are all welcome.<br><br>
        🔗 <strong>github.com/Aayushmaan-19/joule-ai-frontend</strong>`
      }
    ]
  }
};

/* =========================
   BUILD & INJECT THE MODAL HTML
========================= */

function buildModal() {
  const modal = document.createElement("div");
  modal.id = "legalOverlay";
  modal.className = "modal-overlay hidden legal-overlay";
  modal.innerHTML = `
    <div class="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legalModalTitle">
      <div class="legal-modal-header">
        <div class="legal-modal-title-row">
          <span class="legal-modal-icon" id="legalModalIcon"></span>
          <h2 id="legalModalTitle" class="legal-modal-title"></h2>
        </div>
        <p class="legal-modal-updated" id="legalModalUpdated"></p>
        <button class="close-btn legal-close-btn" id="closeLegalModal" aria-label="Close">×</button>
      </div>
      <div class="legal-modal-body" id="legalModalBody"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

const legalOverlay = buildModal();
const legalModal = legalOverlay.querySelector(".legal-modal");
const legalTitle = document.getElementById("legalModalTitle");
const legalIcon = document.getElementById("legalModalIcon");
const legalUpdated = document.getElementById("legalModalUpdated");
const legalBody = document.getElementById("legalModalBody");
const closeLegalBtn = document.getElementById("closeLegalModal");

/* =========================
   RENDER CONTENT
========================= */

function renderContent(key) {
  const content = LEGAL_CONTENT[key];
  if (!content) return;

  legalIcon.textContent = content.icon;
  legalTitle.textContent = content.title;
  legalUpdated.textContent = content.lastUpdated
    ? `Last updated: ${content.lastUpdated}`
    : "";

  legalBody.innerHTML = content.sections
    .map(
      (section) => `
      <div class="legal-section">
        <h3 class="legal-section-heading">${section.heading}</h3>
        <p class="legal-section-body">${section.body}</p>
      </div>
    `
    )
    .join("");

  // Scroll to top on content change
  legalBody.scrollTop = 0;
}

/* =========================
   OPEN / CLOSE
========================= */

function openLegalModal(key) {
  renderContent(key);
  legalOverlay.classList.remove("hidden");
  // Animate in
  requestAnimationFrame(() => {
    legalModal.classList.add("legal-modal--visible");
  });
  document.body.style.overflow = "hidden";
}

function closeLegalModal() {
  legalModal.classList.remove("legal-modal--visible");
  setTimeout(() => {
    legalOverlay.classList.add("hidden");
    document.body.style.overflow = "";
  }, 320);
}

closeLegalBtn.addEventListener("click", closeLegalModal);

legalOverlay.addEventListener("click", (e) => {
  if (e.target === legalOverlay) closeLegalModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !legalOverlay.classList.contains("hidden")) {
    closeLegalModal();
  }
});

/* =========================
   HOOK FOOTER LINKS
========================= */

const LINK_MAP = {
  "/privacy-policy.html": "privacy",
  "/terms.html": "terms",
  "/about.html": "about",
  "/contact.html": "contact"
};

function hookFooterLinks() {
  document.querySelectorAll("footer a").forEach((link) => {
    // Support both data-legal attribute and href mapping
    const key =
      link.dataset.legal || LINK_MAP[link.getAttribute("href")];
    if (!key) return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      openLegalModal(key);
    });
  });
}

// Footer may not exist at module load time if it's below the scripts,
// so hook after DOM is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hookFooterLinks);
} else {
  hookFooterLinks();
}
