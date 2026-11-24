/* Live GitHub data: repository browser, language mix, stats. Falls back to a saved list. */
(function () {
  "use strict";
  var USER = "suhas102", SELF = "suhas102.github.io";
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $("repo-list"); if (!listEl) return;
  var CASE = {
    "self-healing-rag-pipeline": "self-healing-rag", "llm-guardrails-gateway": "llm-guardrails-gateway", "f1-cognitive-load-thesis": "f1-cognitive-load",
    "kri-early-warning-model": "kri-early-warning", "incident-themes-nlp": "incident-themes-nlp", "dependency-network-analysis": "dependency-network",
    "disruption-monte-carlo-simulation": "disruption-monte-carlo", "ai-model-risk-monitoring": "ai-model-risk-monitoring", "Risk-resilience-portfolio": "bia-continuity-plan"
  };
  var COLORS = { Python: "#3572A5", "Jupyter Notebook": "#DA5B0B", JavaScript: "#f1e05a", HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", TypeScript: "#3178c6" };
  var FALLBACK = [
    ["self-healing-rag-pipeline", "LangGraph RAG pipeline with a critic agent, query reformulation and safe fallback."],
    ["llm-guardrails-gateway", "Configurable input and output safety gateway with a YAML policy engine."],
    ["f1-cognitive-load-thesis", "MSc dissertation: cognitive load proxies in F1 telemetry."],
    ["ai-chatbot-testing-evaluation", "Framework for testing and evaluating chatbot quality and edge cases."],
    ["f1-podium-predictor", "Podium prediction from pre-race and qualifying data."],
    ["Risk-resilience-portfolio", "Six data-science projects on operational risk and resilience."]
  ].map(function (r) { return { name: r[0], description: r[1], language: "Python", html_url: "https://github.com/" + USER + "/" + r[0], stargazers_count: 0, pushed_at: null, fork: false }; });

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function col(l) { return COLORS[l] || "#8b949e"; }
  function ago(iso) {
    if (!iso) return "";
    var d = Math.floor((Date.now() - new Date(iso)) / 864e5);
    if (d < 1) return "today"; if (d < 31) return d + " day" + (d > 1 ? "s" : "") + " ago";
    var m = Math.floor(d / 30); if (m < 12) return m + " month" + (m > 1 ? "s" : "") + " ago";
    var y = Math.floor(d / 365); return y + " year" + (y > 1 ? "s" : "") + " ago";
  }
  function load() {
    try { var c = JSON.parse(sessionStorage.getItem("gh-repos") || "null"); if (c && Date.now() - c.t < 36e5) return Promise.resolve(c.d); } catch (e) {}
    return fetch("https://api.github.com/users/" + USER + "/repos?per_page=100&sort=updated", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { try { sessionStorage.setItem("gh-repos", JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d; });
  }

  var repos = [], live = true;
  var search = $("repo-search"), langSel = $("repo-lang"), sortSel = $("repo-sort"), summary = $("repo-summary");

  function view() {
    var q = search.value.trim().toLowerCase(), lang = langSel.value, sort = sortSel.value;
    var out = repos.filter(function (r) {
      return (!lang || r.language === lang) && (!q || (r.name + " " + (r.description || "")).toLowerCase().indexOf(q) > -1);
    });
    out.sort(function (a, b) {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stars") return b.stargazers_count - a.stargazers_count;
      return String(b.pushed_at || "").localeCompare(String(a.pushed_at || ""));
    });
    summary.textContent = out.length + " result" + (out.length === 1 ? "" : "s") + (lang ? " for " + lang : "") + (q ? ' matching "' + search.value.trim() + '"' : "") + (live ? "" : ". GitHub did not respond, so this is a saved list of key repositories.");
    listEl.innerHTML = out.map(function (r) {
      var cs = CASE[r.name];
      return '<li class="rrow"><div><h3><a href="' + esc(r.html_url) + '">' + esc(r.name) + '</a><span class="rbadge">Public</span></h3>' +
        "<p>" + esc(r.description || "No description yet.") + "</p>" +
        '<div class="rmeta">' + (r.language ? '<span><span class="lang-dot" style="background:' + col(r.language) + '"></span>' + esc(r.language) + "</span>" : "") +
        (r.stargazers_count ? "<span>" + r.stargazers_count + " stars</span>" : "") + (r.pushed_at ? "<span>Updated " + ago(r.pushed_at) + "</span>" : "") + "</div></div>" +
        (cs ? '<a class="btn btn-small rcase" href="case-studies/' + cs + '.html">Case study</a>' : "") + "</li>";
    }).join("") || '<li class="rrow"><p>No repositories match. Clear the search or pick another language.</p></li>';
  }

  function render(data) {
    repos = data.filter(function (r) { return !r.fork && r.name !== SELF; });
    var counts = {}; repos.forEach(function (r) { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
    var langs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var total = langs.reduce(function (s, l) { return s + counts[l]; }, 0) || 1;
    var cnt = $("repo-count"); if (cnt) cnt.textContent = repos.length;
    langSel.innerHTML = '<option value="">Language: All</option>' + langs.map(function (l) { return '<option value="' + esc(l) + '">' + esc(l) + "</option>"; }).join("");
    var bar = $("lang-bar"), leg = $("lang-legend"), st = $("gh-stats");
    if (bar) bar.innerHTML = langs.map(function (l) { return '<span class="lang-seg" style="width:' + counts[l] / total * 100 + "%;background:" + col(l) + '" title="' + esc(l) + '"></span>'; }).join("");
    if (leg) leg.innerHTML = langs.map(function (l) { return '<span><span class="lang-dot" style="background:' + col(l) + '"></span>' + esc(l) + " " + Math.round(counts[l] / total * 100) + "%</span>"; }).join(" ");
    var latest = repos.map(function (r) { return r.pushed_at; }).filter(Boolean).sort().pop();
    if (st) st.innerHTML = '<span><b>' + repos.length + "</b>public repositories</span><span><b>" + langs.length + "</b>languages</span>" + (latest ? "<span><b>" + ago(latest) + "</b>latest push</span>" : "");
    view();
  }
  [search, langSel, sortSel].forEach(function (e) { e.addEventListener("input", view); e.addEventListener("change", view); });

  var chart = $("gh-chart-img");
  if (chart) { chart.addEventListener("error", function () { chart.parentNode.hidden = true; }); chart.src = "https://ghchart.rshah.org/0969da/" + USER; }
  if (window.fetch && window.Promise) { load().then(render).catch(function () { live = false; render(FALLBACK); }); } else { live = false; render(FALLBACK); }
})();
