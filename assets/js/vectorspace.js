/* Interactive 3D vector space drawn with a plain 2D canvas: no WebGL, no modules, no libraries,
   so it runs in any browser and from a local file. Synthetic points stand in for embedded text chunks.
   Drag to rotate. Pick a question and a query point flies in; its nearest neighbours light up. */
(function () {
  "use strict";
  var box = document.getElementById("vs");
  if (!box) return;
  var canvas = box.querySelector("canvas"), info = box.querySelector(".vs-info"), chipsEl = box.querySelector(".vs-chips"), leg = box.querySelector(".vs-legend");
  var ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) { var w = box.closest(".vs-wrap"); if (w) w.hidden = true; return; }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CL = [
    { name: "RAG and retrieval", color: "#0969da", c: [3.1, 0.6, 0.4], q: "How do I stop a RAG system hallucinating?" },
    { name: "LLM guardrails", color: "#cf222e", c: [-2.4, 2.0, 1.2], q: "How do I block prompt injection?" },
    { name: "F1 telemetry", color: "#bf8700", c: [0.3, -2.6, 1.8], q: "Do telemetry signals track cognitive load?" },
    { name: "Forecasting and KRIs", color: "#1a7f37", c: [-1.2, -0.8, -3.0], q: "Can I warn before a KPI breaches tolerance?" },
    { name: "Drift and model risk", color: "#8250df", c: [2.0, 2.4, -2.2], q: "How do I detect a model drifting?" },
    { name: "Resilience and impact", color: "#bf3989", c: [-3.2, -1.6, -0.6], q: "What breaks if one supplier fails?" }
  ];
  var PER = 170, N = CL.length * PER, K = 10;
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function gauss() { return Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); }

  var P = [];
  CL.forEach(function (k, ci) {
    for (var i = 0; i < PER; i++) P.push({ x: k.c[0] + gauss() * .62, y: k.c[1] + gauss() * .62, z: k.c[2] + gauss() * .62, ci: ci });
  });

  var rotY = 0.5, rotX = -0.25, vy = 0;
  var query = null, qFrom = null, qTo = null, t = 1, hits = [];

  if (leg) leg.innerHTML = CL.map(function (k) { return '<span><span class="lang-dot" style="background:' + k.color + '"></span>' + k.name + "</span>"; }).join("");

  function nearest(p) {
    return P.map(function (a, i) { var dx = a.x - p.x, dy = a.y - p.y, dz = a.z - p.z; return [dx * dx + dy * dy + dz * dz, i]; })
      .sort(function (a, b) { return a[0] - b[0]; }).slice(0, K).map(function (x) { return x[1]; });
  }
  function ask(ci, label) {
    var k = CL[ci], p = { x: k.c[0] + gauss() * .3, y: k.c[1] + gauss() * .3, z: k.c[2] + gauss() * .3 };
    qFrom = query ? { x: query.x, y: query.y, z: query.z } : { x: 0, y: 0, z: 0 };
    qTo = p; t = reduce ? 1 : 0; if (reduce) query = p; else if (!query) query = { x: 0, y: 0, z: 0 };
    hits = nearest(p);
    var tally = {}; hits.forEach(function (i) { tally[P[i].ci] = (tally[P[i].ci] || 0) + 1; });
    var top = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; })[0];
    info.textContent = '"' + label + '" lands in ' + CL[top].name + ". " + tally[top] + " of its " + K + " nearest chunks come from there, so those are what a retriever would hand to the model.";
    draw();
  }
  CL.forEach(function (k, ci) {
    var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = k.q; b.style.setProperty("--cc", k.color);
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(chipsEl.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      ask(ci, k.q);
    });
    chipsEl.appendChild(b);
  });

  var W = 0, H = 0, dpr = 1;
  function size() {
    var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    W = w; H = h; return true;
  }
  function project(p, cx, sy, cy, sx) {
    // rotate about Y then X
    var x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
    var y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
    var cam = 11, f = (Math.min(W, H) / 7.2) * (W < 520 ? .9 : 1), s = cam / (cam - z2);
    return { x: W / 2 + x1 * f * s, y: H / 2 - y2 * f * s, s: s, z: z2 };
  }
  function draw() {
    if (!size()) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    var proj = P.map(function (p) { return project(p, cx, sy, cy, sx); });
    var order = proj.map(function (_, i) { return i; }).sort(function (a, b) { return proj[a].z - proj[b].z; });
    var hit = {}; hits.forEach(function (i) { hit[i] = 1; });
    for (var n = 0; n < order.length; n++) {
      var i = order[n], q = proj[i], r = (hit[i] ? 5.2 : 2.6) * q.s;
      ctx.globalAlpha = hit[i] ? 1 : Math.max(.25, Math.min(.9, .35 + q.s * .3));
      ctx.fillStyle = CL[P[i].ci].color; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (query) {
      var qp = project(query, cx, sy, cy, sx);
      ctx.strokeStyle = "rgba(140,149,159,.75)"; ctx.lineWidth = 1; ctx.beginPath();
      hits.forEach(function (i) { ctx.moveTo(qp.x, qp.y); ctx.lineTo(proj[i].x, proj[i].y); }); ctx.stroke();
      var pulse = reduce ? 1 : 1 + .25 * Math.sin(Date.now() / 330);
      ctx.fillStyle = "rgba(253,140,115,.28)"; ctx.beginPath(); ctx.arc(qp.x, qp.y, 13 * qp.s * pulse, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#fd8c73"; ctx.beginPath(); ctx.arc(qp.x, qp.y, 6 * qp.s, 0, 6.2832); ctx.fill();
    }
  }

  var drag = false, lx = 0, ly = 0, visible = true, last = 0;
  canvas.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag) return; vy = (e.clientX - lx) * .006; rotY += vy; rotX = Math.max(-1.1, Math.min(1.1, rotX + (e.clientY - ly) * .006)); lx = e.clientX; ly = e.clientY;
  });
  function end() { drag = false; }
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") rotY -= .15; if (e.key === "ArrowRight") rotY += .15; if (e.key === "ArrowUp") rotX = Math.max(-1.1, rotX - .1); if (e.key === "ArrowDown") rotX = Math.min(1.1, rotX + .1); });
  if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
  window.addEventListener("resize", draw);
  document.addEventListener("themechange", draw);

  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 33); };
  function frame(now) {
    raf(frame);
    if (!visible || document.hidden || !canvas.clientWidth) return;
    var dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    if (!reduce && !drag) { rotY += .0016 * (dt / .016) + vy * .9; vy *= .94; }
    if (t < 1 && qTo) { t = Math.min(1, t + dt / .9); var e = 1 - Math.pow(1 - t, 3); query = { x: qFrom.x + (qTo.x - qFrom.x) * e, y: qFrom.y + (qTo.y - qFrom.y) * e, z: qFrom.z + (qTo.z - qFrom.z) * e }; }
    draw();
  }
  ask(0, CL[0].q); chipsEl.children[0].setAttribute("aria-pressed", "true");
  if (reduce) draw(); else raf(frame);
})();
