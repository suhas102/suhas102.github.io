/* Tabs driven by the URL hash: #overview, #repositories, #demos, #experience. */
(function () {
  "use strict";
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  if (!tabs.length) return;
  function show(name, push) {
    if (!document.getElementById(name)) name = "overview";
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-tab") === name;
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (push) { try { history.replaceState(null, "", "#" + name); } catch (e) { location.hash = name; } }
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { show(t.getAttribute("data-tab"), true); });
    t.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
      if (n === null) return;
      n = (n + tabs.length) % tabs.length; tabs[n].focus(); show(tabs[n].getAttribute("data-tab"), true);
    });
  });
  window.addEventListener("hashchange", function () { show(location.hash.slice(1)); });
  show(location.hash.slice(1) || "overview");
})();
