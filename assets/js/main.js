/* Theme toggle, mobile nav, active-section highlight. */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---- theme ---- */
  var toggle = document.getElementById("theme-toggle");
  var moon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var sun = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function paintToggle() {
    if (!toggle) return;
    var dark = root.getAttribute("data-theme") === "dark";
    toggle.innerHTML = dark ? sun : moon;
    toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0b121c" : "#f2f4f7");
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      paintToggle();
      try { document.dispatchEvent(new CustomEvent("themechange")); } catch (e) {}
    });
  }
  paintToggle();

  /* ---- mobile nav ---- */
  var nav = document.getElementById("nav");
  var navBtn = document.getElementById("nav-toggle");
  if (nav && navBtn) {
    navBtn.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      navBtn.setAttribute("aria-expanded", String(!open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.setAttribute("data-open", "false"); navBtn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---- active section in nav ---- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var map = {};
  links.forEach(function (a) { var id = (a.getAttribute("href") || "").replace("#", ""); if (id) map[id] = a; });
  var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.removeAttribute("aria-current"); });
          var a = map[en.target.id];
          if (a) a.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }
})();
