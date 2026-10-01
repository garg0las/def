// assets/js/main.js

// Footer year (if you have <span id="year"></span>)
document.getElementById("year")?.append(new Date().getFullYear());

// -------------------------
// Theme toggle (light/dark)
// -------------------------
// The class lives on <html>, not <body>, so the inline <head> bootstrap on each
// page can apply the stored theme before the first paint.
(function initTheme() {
  const root = document.documentElement;
  const button = document.getElementById("classChangeButton");

  const readStored = () => {
    try {
      return localStorage.getItem("theme");
    } catch (e) {
      return null;
    }
  };

  const store = (value) => {
    try {
      localStorage.setItem("theme", value);
    } catch (e) {
      // Private browsing / blocked storage: the theme just will not persist.
    }
  };

  const apply = (isDark) => {
    root.classList.toggle("darkmode", isDark);

    if (!button) {
      return;
    }

    if (isDark) {
      button.textContent = "Light mode";
      button.setAttribute("aria-pressed", "true");
    } else {
      button.textContent = "Dark mode";
      button.setAttribute("aria-pressed", "false");
    }
  };

  apply(readStored() === "dark");

  if (button) {
    button.addEventListener("click", () => {
      const isDark = !root.classList.contains("darkmode");
      apply(isDark);

      if (isDark) {
        store("dark");
      } else {
        store("light");
      }
    });
  }
})();




// -------------------------
// Go to top button
// -------------------------
// -------------------------
// Go to top button (robust init)
// -------------------------
(function initToTop() {
  const setup = () => {
    const btn = document.querySelector(".to-top");
    if (!btn) return;

    const toggle = () => {
      if (window.scrollY > 300) btn.classList.add("to-top--visible");
      else btn.classList.remove("to-top--visible");
    };

    window.addEventListener("scroll", toggle, { passive: true });
    toggle();

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  // Run now (script is at bottom so button should exist)
  setup();

  // Also run after DOMContentLoaded as a fallback
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  }
})();



// -------------------------
// Resources tabs (if on page)
// -------------------------
(() => {
  const tabs = document.querySelectorAll(".res-tab");
  const cards = document.querySelectorAll(".res-card");
  if (!tabs.length || !cards.length) return;

  const activate = (cat) => {
    tabs.forEach((t) => {
      const isActive = t.dataset.cat === cat;
      t.classList.toggle("res-tab--active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    cards.forEach((card) => {
      if (cat === "all") {
        card.style.display = "";
      } else {
        const cats = card.dataset.cats ? card.dataset.cats.split(" ") : [];
        if (cats.includes(cat)) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      }
    });
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => activate(tab.dataset.cat || "all")));

  const allTab = document.querySelector('.res-tab[data-cat="all"]');
  activate(allTab?.dataset.cat || tabs[0].dataset.cat || "all");
})();


// -------------------------
// Upcoming Highlights (SheetDB integration)
// -------------------------
// -------------------------
// Upcoming Highlights
// Spreadsheet columns:
// Month | Day | Time | Location | Event Name | Event Desc
// -------------------------
(async () => {
  const container = document.getElementById("upcoming-highlights");
  if (!container) return;

  try {
    const response = await fetch("https://sheetdb.io/api/v1/jm26rrrk95jpl");

    if (!response.ok) {
      throw new Error("Failed to fetch event highlights");
    }

    const data = await response.json();

    let events = data.map(row => ({
      month: (row["Month"] || "").trim(),
      day: (row["Day"] || "").trim(),
      time: (row["Time"] || "").trim(),
      location: (row["Location"] || "").trim(),
      name: (row["Event Name"] || "").trim(),
      desc: (row["Event Desc"] || "").trim()
    }));

    events = events.filter(evt => evt.name);

    if (events.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.6);">No upcoming events.</div>';
      return;
    }

    container.innerHTML = events.map(evt => `
      <div class="up-item">
        <div class="up-date">
          <div class="up-month">${evt.month || "EVENT"}</div>
          <div class="up-day">${evt.day || ""}</div>
        </div>

        <div class="up-info">
          <div class="up-top">
            <h3 class="up-title">${evt.name}</h3>
            <span class="chip">EVENT</span>
          </div>

          <p class="up-desc">${evt.desc}</p>

          <div class="up-meta">
            <span>🕒 ${evt.time || "TBA"}</span>
            <span>📍 ${evt.location || "TBA"}</span>
          </div>
        </div>

        <div class="up-right">
          <a class="up-cta" href="calendar.html">Details →</a>
        </div>
      </div>
    `).join("");

  } catch (err) {
    console.error(err);

    container.innerHTML =
      '<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.6);">Failed to load upcoming events.</div>';
  }
})();


// -------------------------
// Newsletter (archive)
// -------------------------
// Signup is EmailOctopus's own embed script on newsletter.html, not code here.
// Their endpoint answers with JSON and requires a reCAPTCHA token that only their
// script obtains, so a plain form POST from our markup cannot subscribe anyone.
const NEWSLETTER_CONFIG = {
  archiveUrl: "assets/data/newsletter.json"
};

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

(function initNewsletterBanner() {
  const banner = document.getElementById("nl-subscribed-banner");
  if (!banner) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("subscribed") === "1") {
    banner.hidden = false;
  }
})();

(async function initNewsletterArchive() {
  const container = document.getElementById("newsletter-archive");
  if (!container) {
    return;
  }

  const showMessage = (text) => {
    const msg = document.createElement("div");
    msg.className = "nl-archive-msg";
    msg.textContent = text;
    container.replaceChildren(msg);
  };

  // Only http(s) permalinks become links, so a bad feed value cannot become a
  // javascript: href.
  const safeLink = (value) => {
    // An empty value would resolve to the current page and render as a link
    // back to itself.
    if (String(value).trim().length === 0) {
      return "";
    }
    try {
      const parsed = new URL(value, window.location.href);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
      return "";
    } catch (e) {
      return "";
    }
  };

  const timeOf = (issue) => {
    const parsed = new Date(issue.date);
    if (Number.isNaN(parsed.getTime())) {
      return 0;
    }
    return parsed.getTime();
  };

  const formatDate = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    // Pinned to UTC so a date-only string does not show the previous day west
    // of Greenwich.
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
  };

  try {
    const response = await fetch(NEWSLETTER_CONFIG.archiveUrl, { cache: "no-cache" });

    if (!response.ok) {
      throw new Error(`Archive request failed with status ${response.status}`);
    }

    const data = await response.json();

    let issues = [];
    if (data && Array.isArray(data.issues)) {
      issues = data.issues.slice();
    }

    if (issues.length === 0) {
      showMessage("No issues yet.");
      return;
    }

    issues.sort((a, b) => {
      return timeOf(b) - timeOf(a);
    });

    container.innerHTML = issues.map((issue) => {
      const date = formatDate(issue.date);
      const link = safeLink(issue.url || "");

      let title = "Untitled issue";
      if (issue.title) {
        title = issue.title;
      }

      let dateHtml = "";
      if (date.length > 0) {
        dateHtml = `<div class="nl-issue-date">${escapeHtml(date)}</div>`;
      }

      // Prefer the full plain-text body. Fall back to the summary when the
      // provider gives us no body for that issue.
      let bodyHtml = "";
      if (issue.bodyText) {
        bodyHtml = `<p class="nl-issue-body">${escapeHtml(issue.bodyText)}</p>`;
      } else if (issue.summary) {
        bodyHtml = `<p class="nl-issue-summary">${escapeHtml(issue.summary)}</p>`;
      }

      let linkHtml = "";
      if (link.length > 0) {
        linkHtml =
          `<a class="btn secondary nl-issue-link" href="${escapeHtml(link)}"` +
          ` target="_blank" rel="noopener">Read in browser →</a>`;
      }

      return `
      <article class="nl-issue">
        ${dateHtml}
        <h3 class="nl-issue-title">${escapeHtml(title)}</h3>
        ${bodyHtml}
        ${linkHtml}
      </article>
    `;
    }).join("");

  } catch (err) {
    console.error(err);
    showMessage("Could not load past issues. Please try again later.");
  }
})();
