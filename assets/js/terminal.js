/* Types the intro in the README terminal. Static text if reduced motion. */
(function () {
  "use strict";
  var el = document.getElementById("term-body"); if (!el) return;
  var lines = [
    ["p", "$ ", "c", "whoami"],
    ["", "Suhas Suresha, AI engineer and data scientist, London"],
    ["p", "$ ", "c", "ls focus/"],
    ["", "reliable-llm-apps/  applied-ml/  data-engineering/"],
    ["p", "$ ", "c", "git log --oneline -3"],
    ["d", "a1f  guardrail gateway: 2,000 adversarial prompts"],
    ["d", "b27  self-healing RAG: critic agent in the loop"],
    ["d", "c9e  F1 telemetry: 65,000+ laps tested, not assumed"],
    ["p", "$ ", "c", "cat status"],
    ["", "available immediately, London hybrid or on-site"]
  ];
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function span(cls, t) { return cls ? '<span class="' + cls + '">' + t.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>" : t.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function lineHTML(l, typed) {
    var out = "";
    if (l[0] === "p") out = span("p", l[1]) + span(l[2], typed === null ? l[3] : l[3].slice(0, typed));
    else out = span(l[0], l[1]);
    return out;
  }
  if (reduce) { el.innerHTML = lines.map(function (l) { return lineHTML(l, null); }).join("\n"); return; }
  var done = [], li = 0, ci = 0, caret = '<span class="term-caret"></span>';
  function paint(cur) { el.innerHTML = done.concat(cur === undefined ? [] : [cur]).join("\n") + (cur === undefined ? "\n" : "") + caret; }
  function step() {
    if (li >= lines.length) { el.innerHTML = done.join("\n") + "\n" + caret; return; }
    var l = lines[li];
    if (l[0] === "p") {
      ci++;
      paint(lineHTML(l, ci));
      if (ci >= l[3].length) { done.push(lineHTML(l, null)); li++; ci = 0; setTimeout(step, 280); } else setTimeout(step, 55);
    } else { done.push(lineHTML(l, null)); li++; paint(); setTimeout(step, 160); }
  }
  var started = false;
  function start() { if (started) return; started = true; step(); }
  if ("IntersectionObserver" in window) { new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { start(); o.disconnect(); } }).observe(el); } else start();
})();
