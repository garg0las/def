// assets/js/main.js

// Footer year (if you have <span id="year"></span>)
document.getElementById("year")?.append(new Date().getFullYear());

// -------------------------
// Theme toggle (light/dark)
// -------------------------
// -------------------------
// Theme toggle (light/dark)
// -------------------------
const button = document.getElementById('classChangeButton');
const body = document.getElementById('cuerpo');
button.addEventListener('click', function() {
    body.classList.toggle('darkmode');
    localStorage.setItem('cuerpo','darkmode');
});




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
  const panels = document.querySelectorAll(".res-panel");
  if (!tabs.length || !panels.length) return;

  const activate = (cat) => {
    tabs.forEach((t) => {
      const isActive = t.dataset.cat === cat;
      t.classList.toggle("res-tab--active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    panels.forEach((p) => {
      const panelName = p.dataset.panel;
      p.hidden = cat === "all" ? panelName !== "all" : panelName !== cat;
    });
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => activate(tab.dataset.cat || "all")));

  const allTab = document.querySelector('.res-tab[data-cat="all"]');
  activate(allTab?.dataset.cat || tabs[0].dataset.cat || "all");
})();
