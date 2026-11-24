/* Clickable dependency map with failure cascade. Fictional same-day delivery process. */
(function () {
  "use strict";
  var svg = document.getElementById("dm-svg");
  var verdict = document.getElementById("dm-verdict");
  var presetBox = document.getElementById("dm-presets");
  if (!svg || !verdict || !presetBox) return;
  var NS = "http://www.w3.org/2000/svg";

  var rows = [
    { y: 30, ids: ["root"] },
    { y: 110, ids: ["order", "pick", "pack", "dispatch", "deliver"] },
    { y: 210, ids: ["web", "oms", "pay", "stock", "feed", "handheld"] },
    { y: 300, ids: ["wms", "carA", "carB", "dcN", "dcS"] },
    { y: 400, ids: ["cloud", "net", "sso"] }
  ];
  var N = {
    root: "Same-day delivery", order: "Take order", pick: "Pick items", pack: "Pack", dispatch: "Dispatch", deliver: "Last-mile delivery",
    web: "Website and app", oms: "Order system", pay: "Payment gateway", stock: "Stock system", feed: "Key stock feed", handheld: "Handheld scanners",
    wms: "Warehouse system", carA: "Carrier A", carB: "Carrier B", dcN: "DC North", dcS: "DC South",
    cloud: "Cloud region A", net: "Core network", sso: "Identity and sign-in"
  };
  var D = {
    root: ["order", "pick", "pack", "dispatch", "deliver"],
    order: ["web", "oms", "pay"], pick: ["wms", "handheld", "stock"], pack: ["wms"], dispatch: ["oms", "wms"], deliver: [["carA", "carB"]],
    web: ["cloud", "sso"], oms: ["cloud", "net"], pay: ["net"], stock: ["feed", "cloud"], feed: ["net"], handheld: ["net", "sso"],
    wms: ["cloud", "dcN"], dcN: ["net"], carA: [], carB: [], dcS: [], cloud: [], net: [], sso: []
  };
  var W = 138, H = 38, pos = {};
  rows.forEach(function (r) {
    var n = r.ids.length, gap = 1000 / n;
    r.ids.forEach(function (id, i) { pos[id] = { x: gap * (i + .5), y: r.y }; });
  });

  var failed = {};
  function compute() {
    var down = {}, memo = {};
    function isDown(id) {
      if (id in memo) return memo[id];
      memo[id] = false;
      var d = !!failed[id];
      if (!d) d = D[id].some(function (dep) {
        return Array.isArray(dep) ? dep.every(isDown) : isDown(dep);
      });
      memo[id] = d; return d;
    }
    Object.keys(N).forEach(function (id) { down[id] = isDown(id); });
    return down;
  }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  var edgeG = el("g", {}, svg), nodeG = el("g", {}, svg), edges = [], nodes = {};

  Object.keys(D).forEach(function (id) {
    D[id].forEach(function (dep) {
      (Array.isArray(dep) ? dep : [dep]).forEach(function (to) {
        var a = pos[id], b = pos[to], y1 = a.y + H / 2, y2 = b.y - H / 2, my = (y1 + y2) / 2;
        var p = el("path", { "class": "map-edge", d: "M" + a.x + " " + y1 + " C" + a.x + " " + my + " " + b.x + " " + my + " " + b.x + " " + y2, fill: "none" }, edgeG);
        edges.push({ from: id, to: to, el: p });
      });
    });
  });

  Object.keys(N).forEach(function (id) {
    var p = pos[id];
    var g = el("g", { "class": "map-node", tabindex: "0", role: "button", "data-id": id, transform: "translate(" + (p.x - W / 2) + " " + (p.y - H / 2) + ")" }, nodeG);
    if (id === "dcS") g.setAttribute("data-kind", "orphan");
    el("rect", { width: W, height: H, rx: 6 }, g);
    var t = el("text", { x: W / 2, y: H / 2 + 4, "text-anchor": "middle" }, g);
    t.textContent = N[id];
    nodes[id] = g;
    function toggle() { if (id === "root") return; failed[id] = !failed[id]; if (!failed[id]) delete failed[id]; paint(); }
    g.addEventListener("click", toggle);
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });

  function paint() {
    var down = compute();
    Object.keys(nodes).forEach(function (id) {
      var s = failed[id] ? "failed" : (down[id] ? "down" : "ok");
      if (s === "ok") nodes[id].removeAttribute("data-state"); else nodes[id].setAttribute("data-state", s);
      nodes[id].setAttribute("aria-pressed", String(!!failed[id]));
      nodes[id].setAttribute("aria-label", N[id] + ": " + (s === "failed" ? "failed" : s === "down" ? "stopped by a dependency" : "working") + (id === "root" ? "" : ". Press to toggle failure."));
    });
    edges.forEach(function (e) { if (down[e.to]) e.el.setAttribute("data-hot", "true"); else e.el.removeAttribute("data-hot"); });
    var nf = Object.keys(failed).length, stopped = Object.keys(down).filter(function (id) { return down[id] && !failed[id]; });
    if (!nf) {
      verdict.setAttribute("data-ok", "true");
      verdict.textContent = "Everything is working. Select a box to fail it, or try a preset.";
    } else if (down.root) {
      verdict.setAttribute("data-ok", "false");
      verdict.textContent = "Same-day delivery has stopped. " + nf + " failure" + (nf > 1 ? "s" : "") + " took out " + stopped.length + " other component" + (stopped.length === 1 ? "" : "s") + ".";
    } else {
      verdict.setAttribute("data-ok", "true");
      verdict.textContent = "Same-day delivery survives. " + nf + " failure" + (nf > 1 ? "s" : "") + ", " + stopped.length + " knock-on, and the process still works because the failed parts are covered or optional.";
    }
  }

  var PRESETS = [
    ["Fail Carrier A", ["carA"]], ["Fail both carriers", ["carA", "carB"]], ["Fail Cloud region A", ["cloud"]],
    ["Fail core network", ["net"]], ["Fail DC South", ["dcS"]]
  ];
  PRESETS.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = p[0];
    b.addEventListener("click", function () { failed = {}; p[1].forEach(function (id) { failed[id] = true; }); paint(); });
    presetBox.appendChild(b);
  });
  var rb = document.getElementById("dm-reset");
  if (rb) rb.addEventListener("click", function () { failed = {}; paint(); });
  paint();
})();
