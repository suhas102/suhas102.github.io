/* Live GitHub section: repo list, stats, language mix. Falls back to a static list. */
(function () {
  "use strict";
  var USER = "suhas102", SELF = "suhas102.github.io";
  var statsEl = document.getElementById("gh-stats"), barEl = document.getElementById("lang-bar"), legEl = document.getElementById("lang-legend");
  var filtEl = document.getElementById("gh-filters"), gridEl = document.getElementById("repo-grid"), chart = document.getElementById("gh-chart-img");
  if (!gridEl) return;

  var COLORS = ["#2447e8", "#d4871c", "#1f9d6b", "#a23bd1", "#c0392b", "#17a2b8", "#7a8696"];
  var FALLBACK = [
    ["self-healing-rag-pipeline", "LangGraph RAG pipeline with a critic agent, query reformulation and safe fallback.", "Python"],
    ["llm-guardrails-gateway", "Configurable input and output safety gateway with a YAML policy engine.", "Python"],
    ["f1-cognitive-load-thesis", "MSc dissertation: cognitive load proxies in F1 telemetry.", "Python"],
    ["ai-chatbot-testing-evaluation", "Framework for testing and evaluating chatbot quality and edge cases.", "Python"],
    ["f1-podium-predictor", "Podium prediction from pre-race and qualifying data.", "Python"],
    ["Risk-resilience-portfolio", "Six data-science projects on operational risk and resilience.", "Python"]
  ].map(function (r) { return { name: r[0], description: r[1], language: r[2], html_url: "https://github.com/" + USER + "/" + r[0], stargazers_count: 0, pushed_at: null, fork: false, fallback: true }; });

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ago(iso) {
    if (!iso) return "";
    var d = Math.floor((Date.now() - new Date(iso)) / 864e5);
    if (d < 1) return "today"; if (d < 31) return d + " day" + (d > 1 ? "s" : "") + " ago";
    var m = Math.floor(d / 30); if (m < 12) return m + " month" + (m > 1 ? "s" : "") + " ago";
    var y = Math.floor(d / 365); return y + " year" + (y > 1 ? "s" : "") + " ago";
  }

  function load() {
    try {
      var c = JSON.parse(sessionStorage.getItem("gh-repos") || "null");
      if (c && Date.now() - c.t < 36e5) return Promise.resolve(c.d);
    } catch (e) {}
    return fetch("https://api.github.com/users/" + USER + "/repos?per_page=100&sort=updated", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { try { sessionStorage.setItem("gh-repos", JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d; });
  }

  var repos = [], active = "All";
  function renderGrid() {
    var list = repos.filter(function (r) { return active === "All" || r.language === active; });
    gridEl.innerHTML = list.map(function (r) {
      return '<article class="repo"><h3 class="repo-name"><a href="' + esc(r.html_url) + '">' + esc(r.name) + "</a></h3>" +
        '<p class="repo-desc">' + esc(r.description || "No description yet.") + "</p>" +
        '<p class="repo-meta">' + (r.language ? '<span><span class="lang-dot" style="background:' + colorFor(r.language) + '"></span>' + esc(r.language) + "</span>" : "") +
        (r.stargazers_count ? "<span>" + r.stargazers_count + " stars</span>" : "") +
        (r.pushed_at ? "<span>Updated " + ago(r.pushed_at) + "</span>" : "") + "</p></article>";
    }).join("") || '<p class="muted">No repositories in this language.</p>';
  }
  var langOrder = [];
  function colorFor(l) { var i = langOrder.indexOf(l); return COLORS[(i < 0 ? COLORS.length - 1 : Math.min(i, COLORS.length - 1))]; }

  function render(data, live) {
    repos = data.filter(function (r) { return !r.fork && r.name !== SELF; });
    var counts = {};
    repos.forEach(function (r) { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
    langOrder = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var total = langOrder.reduce(function (s, l) { return s + counts[l]; }, 0) || 1;

    var latest = repos.map(function (r) { return r.pushed_at; }).filter(Boolean).sort().pop();
    if (statsEl) statsEl.innerHTML =
      '<div><span class="gh-num">' + repos.length + '</span><span class="gh-label">public repositories</span></div>' +
      '<div><span class="gh-num">' + langOrder.length + '</span><span class="gh-label">languages</span></div>' +
      (latest ? '<div><span class="gh-num">' + ago(latest) + '</span><span class="gh-label">latest push</span></div>' : "");
    if (barEl) barEl.innerHTML = langOrder.map(function (l) { return '<span class="lang-seg" style="width:' + (counts[l] / total * 100) + "%;background:" + colorFor(l) + '" title="' + esc(l) + '"></span>'; }).join("");
    if (legEl) legEl.innerHTML = langOrder.map(function (l) { return '<span><span class="lang-dot" style="background:' + colorFor(l) + '"></span>' + esc(l) + " " + Math.round(counts[l] / total * 100) + "%</span>"; }).join("");
    if (filtEl) {
      filtEl.innerHTML = "";
      ["All"].concat(langOrder).forEach(function (l) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = l; b.setAttribute("aria-pressed", String(l === active));
        b.addEventListener("click", function () {
          active = l;
          Array.prototype.forEach.call(filtEl.children, function (c) { c.setAttribute("aria-pressed", String(c.textContent === l)); });
          renderGrid();
        });
        filtEl.appendChild(b);
      });
    }
    renderGrid();
    if (!live && gridEl.parentNode) {
      var n = document.createElement("p"); n.className = "gh-error";
      n.textContent = "GitHub didn't respond, so this is a saved list of key repositories. Reload to try again.";
      gridEl.parentNode.insertBefore(n, gridEl);
    }
  }

  if (chart) {
    chart.addEventListener("error", function () { chart.parentNode.hidden = true; });
    chart.src = "https://ghchart.rshah.org/2447e8/" + USER;
  }
  load().then(function (d) { render(d, true); }).catch(function () { render(FALLBACK, false); });
})();
