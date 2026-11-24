/* Simplified in-browser version of the peak-trading outage Monte Carlo.
   Fixed random draws are reused so sliders move the result smoothly. */
(function () {
  "use strict";
  var canvas = document.getElementById("mc-canvas");
  var readouts = document.getElementById("mc-readouts");
  if (!canvas || !readouts) return;

  var N = 20000, TOL = 3, AOV = 40;
  var SHAPE = [1,1,1,1,1,2,3,4,5,5,5,6,7,6,5,5,6,7,8,9,8,6,4,2]; // relative hourly demand
  var SUM = SHAPE.reduce(function (a, b) { return a + b; }, 0);

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry(20260);
  function gauss() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  var base = { start: new Float64Array(N), zd: new Float64Array(N), za: new Float64Array(N), uf: new Float64Array(N) };
  for (var i = 0; i < N; i++) { base.start[i] = rnd() * 24; base.zd[i] = gauss(); base.za[i] = gauss(); base.uf[i] = rnd(); }

  function share(start, dur) { // share of the day's demand falling inside [start, start+dur), wrapping
    var s = 0, t = start, left = dur;
    while (left > 1e-9) {
      var h = Math.floor(t) % 24, step = Math.min(left, Math.floor(t) + 1 - t);
      s += SHAPE[h] / SUM * step; t += step; left -= step;
    }
    return s;
  }

  var ctl = {
    median: document.getElementById("mc-median"), failover: document.getElementById("mc-failover"),
    abandon: document.getElementById("mc-abandon"), manual: document.getElementById("mc-manual"), rev: document.getElementById("mc-rev")
  };
  var outs = { median: "mc-median-out", failover: "mc-failover-out", abandon: "mc-abandon-out", manual: "mc-manual-out", rev: "mc-rev-out" };
  var fmt = {
    median: function (v) { return v + " h"; }, failover: function (v) { return v + "%"; }, abandon: function (v) { return v + "%"; },
    manual: function (v) { return v + "%"; }, rev: function (v) { return "GBP " + v + "m"; }
  };

  function run() {
    var med = +ctl.median.value, pf = +ctl.failover.value / 100, ab = +ctl.abandon.value / 100, man = +ctl.manual.value / 100, rev = +ctl.rev.value;
    var noPlan = new Float64Array(N), plan = new Float64Array(N), long4 = 0;
    for (var i = 0; i < N; i++) {
      var dur = Math.min(48, med * Math.exp(0.8 * base.zd[i]));
      if (dur > 4) long4++;
      var sh = share(base.start[i], dur);
      var orders = rev * 1e6 * sh / AOV;
      noPlan[i] = (rev * sh + orders * 2 / 1e6) ;
      var eff = base.uf[i] < pf ? Math.min(dur, 0.75) : dur;
      var sh2 = share(base.start[i], eff);
      var a = Math.min(0.95, Math.max(0.05, ab + 0.06 * base.za[i]));
      var lost = rev * sh2 * a * (1 - man);
      var comp = rev * 1e6 * sh2 / AOV * 2 * 0.5 / 1e6;
      plan[i] = lost + comp;
    }
    return { a: noPlan, b: plan, p4: long4 / N };
  }
  function stats(arr) {
    var s = Array.prototype.slice.call(arr).sort(function (x, y) { return x - y; });
    var mean = s.reduce(function (p, c) { return p + c; }, 0) / s.length;
    var over = 0; for (var i = 0; i < s.length; i++) if (s[i] > TOL) over++;
    return { mean: mean, p95: s[Math.floor(0.95 * s.length)], p99: s[Math.floor(0.995 * s.length)], pTol: over / s.length };
  }
  function cssv(n, d) { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || d; }

  function draw(res, sa, sb) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight || 260;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    var L = 12, R = 12, T = 12, B = 30, pw = w - L - R, ph = h - T - B;
    var max = Math.max(TOL * 1.6, sa.p99, sb.p99), bins = 40, ha = new Array(bins).fill(0), hb = new Array(bins).fill(0);
    function put(arr, hist) { for (var i = 0; i < N; i++) { var k = Math.min(bins - 1, Math.floor(arr[i] / max * bins)); hist[k]++; } }
    put(res.a, ha); put(res.b, hb);
    var top = Math.max.apply(null, ha.concat(hb)) || 1, bw = pw / bins;
    var cBlock = cssv("--block", "#c0392b"), cAcc = cssv("--accent", "#2447e8"), cInk = cssv("--ink-2", "#555"), cLine = cssv("--line", "#ccc");
    function bars(hist, col, alpha) {
      c.fillStyle = col; c.globalAlpha = alpha;
      for (var k = 0; k < bins; k++) { var bh = hist[k] / top * ph; c.fillRect(L + k * bw + 1, T + ph - bh, bw - 2, bh); }
      c.globalAlpha = 1;
    }
    bars(ha, cBlock, 0.55); bars(hb, cAcc, 0.7);
    c.strokeStyle = cLine; c.beginPath(); c.moveTo(L, T + ph + .5); c.lineTo(L + pw, T + ph + .5); c.stroke();
    var tx = L + TOL / max * pw;
    c.setLineDash([5, 4]); c.strokeStyle = cInk; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tx, T); c.lineTo(tx, T + ph); c.stroke(); c.setLineDash([]); c.lineWidth = 1;
    c.fillStyle = cInk; c.font = "12px " + (getComputedStyle(document.body).fontFamily || "sans-serif"); 
    for (var g = 0; g <= 4; g++) { var v = max * g / 4; c.textAlign = g === 0 ? "left" : g === 4 ? "right" : "center"; c.fillText("GBP " + v.toFixed(1) + "m", L + (g / 4) * pw, h - 10); }
  }

  function render() {
    Object.keys(ctl).forEach(function (k) { var o = document.getElementById(outs[k]); if (o) o.textContent = fmt[k](ctl[k].value); });
    var res = run(), sa = stats(res.a), sb = stats(res.b);
    draw(res, sa, sb);
    function m(v) { return "GBP " + v.toFixed(2) + "m"; }
    function pc(v) { return (v * 100).toFixed(1) + "%"; }
    function cell(label, a, b) { return '<div class="readout"><div class="readout-label">' + label + '</div><div class="readout-pair"><span class="readout-val" style="color:var(--block)">' + a + '</span><span class="readout-val" style="color:var(--accent)">' + b + "</span></div></div>"; }
    readouts.innerHTML =
      cell("Average loss", m(sa.mean), m(sb.mean)) + cell("Bad-day loss (95th pct)", m(sa.p95), m(sb.p95)) +
      cell("Chance loss exceeds GBP 3m", pc(sa.pTol), pc(sb.pTol)) +
      '<div class="readout"><div class="readout-label">Outages longer than 4 hours</div><div class="readout-val">' + pc(res.p4) + "</div></div>";
  }

  var pending = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; render(); }); }
  var defaults = {};
  Object.keys(ctl).forEach(function (k) { defaults[k] = ctl[k].value; ctl[k].addEventListener("input", schedule); });
  var rb = document.getElementById("mc-reset");
  if (rb) rb.addEventListener("click", function () { Object.keys(ctl).forEach(function (k) { ctl[k].value = defaults[k]; }); schedule(); });
  window.addEventListener("resize", schedule);
  document.addEventListener("themechange", schedule);
  render();
})();
