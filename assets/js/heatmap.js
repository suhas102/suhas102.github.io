/* Project timeline drawn like a contribution graph: one column per month, one cell per week.
   Level = how many things were running that week. Dates come from the roles and projects on this site. */
(function () {
  "use strict";
  var root = document.getElementById("heat"); if (!root) return;
  var ITEMS = [
    ["REVIORA Technologies, data science", "2025-01-01", "2025-07-31"],
    ["Student Voice Representative", "2025-10-01", "2026-11-30"],
    ["AWS Club co-captain", "2026-01-01", "2026-11-30"],
    ["Self-healing RAG pipeline", "2026-02-01", "2026-06-30"],
    ["Guardrails gateway", "2026-06-01", "2026-08-31"],
    ["F1 dissertation", "2026-06-01", "2026-08-31"],
    ["Reliability engineering series", "2026-10-01", "2026-11-30"]
  ];
  var MONTHS = [], y = 2025, m = 0;
  while (y < 2026 || m <= 10) { MONTHS.push([y, m]); m++; if (m > 11) { m = 0; y++; } }
  var NM = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function active(d) {
    return ITEMS.filter(function (it) { return d >= new Date(it[1]) && d <= new Date(it[2]); }).map(function (it) { return it[0]; });
  }
  var cols = MONTHS.map(function (mm) {
    var cells = "";
    for (var w = 0; w < 5; w++) {
      var day = 1 + w * 7, last = new Date(mm[0], mm[1] + 1, 0).getDate();
      if (day > last) { cells += '<i class="hc hc-x"></i>'; continue; }
      var d = new Date(Date.UTC(mm[0], mm[1], day)), a = active(d), lvl = Math.min(4, a.length);
      var label = NM[mm[1]] + " " + mm[0] + ", week " + (w + 1) + ": " + (a.length ? a.join("; ") : "nothing recorded");
      cells += '<i class="hc hc-' + lvl + '" title="' + label.replace(/"/g, "&quot;") + '" data-tip="' + label.replace(/"/g, "&quot;") + '"></i>';
    }
    return '<div class="hcol">' + cells + '<span class="hmon">' + NM[mm[1]] + (mm[1] === 0 ? " " + String(mm[0]).slice(2) : "") + "</span></div>";
  }).join("");
  root.innerHTML = '<div class="hgrid" role="img" aria-label="Timeline of projects and roles by week, January 2025 to November 2026">' + cols + "</div>" +
    '<div class="hfoot"><span>Each square is a week. Darker means more running at once.</span><span class="hleg">Less <i class="hc hc-0"></i><i class="hc hc-1"></i><i class="hc hc-2"></i><i class="hc hc-3"></i><i class="hc hc-4"></i> More</span></div>' +
    '<p class="hnow" id="hnow" aria-live="polite">Hover or tap a square to see what was running.</p>';
  var now = document.getElementById("hnow");
  root.addEventListener("mouseover", function (e) { if (e.target.dataset && e.target.dataset.tip) now.textContent = e.target.dataset.tip; });
  root.addEventListener("click", function (e) { if (e.target.dataset && e.target.dataset.tip) now.textContent = e.target.dataset.tip; });
})();
