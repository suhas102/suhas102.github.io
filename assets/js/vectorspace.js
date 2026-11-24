/* Interactive 3D vector space (Three.js). Illustrative: synthetic points stand in for embedded text chunks.
   Drag to rotate. Pick a question and a query point flies in, and its nearest neighbours light up. */
import * as THREE from "../vendor/three.module.min.js";

const box = document.getElementById("vs");
if (box) init();

function init() {
  const canvas = box.querySelector("canvas");
  const info = box.querySelector(".vs-info");
  const chipsEl = box.querySelector(".vs-chips");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { box.closest(".vs-wrap").hidden = true; return; }

  const CL = [
    { name: "RAG and retrieval", color: 0x0969da, c: [3.1, 0.6, 0.4], q: "How do I stop a RAG system hallucinating?" },
    { name: "LLM guardrails", color: 0xcf222e, c: [-2.4, 2.0, 1.2], q: "How do I block prompt injection?" },
    { name: "F1 telemetry", color: 0xbf8700, c: [0.3, -2.6, 1.8], q: "Do telemetry signals track cognitive load?" },
    { name: "Forecasting and KRIs", color: 0x1a7f37, c: [-1.2, -0.8, -3.0], q: "Can I warn before a KPI breaches tolerance?" },
    { name: "Drift and model risk", color: 0x8250df, c: [2.0, 2.4, -2.2], q: "How do I detect a model drifting?" },
    { name: "Resilience and impact", color: 0xbf3989, c: [-3.2, -1.6, -0.6], q: "What breaks if one supplier fails?" }
  ];
  const PER = 170, N = CL.length * PER;

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), cluster = new Uint8Array(N);
  CL.forEach((k, ci) => {
    const base = new THREE.Color(k.color);
    for (let i = 0; i < PER; i++) {
      const j = ci * PER + i; cluster[j] = ci;
      for (let a = 0; a < 3; a++) pos[j * 3 + a] = k.c[a] + gauss() * 0.62;
      col.set([base.r, base.g, base.b], j * 3);
    }
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.set(0, 0, 11);
  const group = new THREE.Group(); scene.add(group);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, "#fff"); gr.addColorStop(.55, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.24, vertexColors: true, map: dot, transparent: true, alphaTest: 0.05, opacity: 0.85, depthWrite: false }));
  group.add(pts);

  const hiGeo = new THREE.BufferGeometry();
  const hi = new THREE.Points(hiGeo, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, map: dot, transparent: true, alphaTest: 0.05, depthWrite: false }));
  group.add(hi);
  const lineGeo = new THREE.BufferGeometry();
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x8c959f, transparent: true, opacity: 0.7 }));
  group.add(lines);
  const qMesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), new THREE.MeshBasicMaterial({ color: 0xfd8c73 }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), new THREE.MeshBasicMaterial({ color: 0xfd8c73, transparent: true, opacity: 0.25 }));
  qMesh.add(halo); qMesh.visible = false; group.add(qMesh);

  const K = 10;
  let target = null, from = null, t = 1;
  function neighbours(p) {
    const d = [];
    for (let i = 0; i < N; i++) { const dx = pos[i*3]-p.x, dy = pos[i*3+1]-p.y, dz = pos[i*3+2]-p.z; d.push([dx*dx+dy*dy+dz*dz, i]); }
    d.sort((a, b) => a[0] - b[0]); return d.slice(0, K).map(x => x[1]);
  }
  function light(p) {
    const nn = neighbours(p), hp = new Float32Array(K * 3), hc = new Float32Array(K * 3), lp = new Float32Array(K * 6), tally = {};
    nn.forEach((i, n) => {
      hp.set([pos[i*3], pos[i*3+1], pos[i*3+2]], n * 3); hc.set([col[i*3], col[i*3+1], col[i*3+2]], n * 3);
      lp.set([p.x, p.y, p.z, pos[i*3], pos[i*3+1], pos[i*3+2]], n * 6);
      tally[cluster[i]] = (tally[cluster[i]] || 0) + 1;
    });
    hiGeo.setAttribute("position", new THREE.BufferAttribute(hp, 3)); hiGeo.setAttribute("color", new THREE.BufferAttribute(hc, 3));
    lineGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));
    const top = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
    return { top: +top, count: tally[top] };
  }
  function ask(ci, label) {
    const k = CL[ci], p = new THREE.Vector3(k.c[0] + gauss() * 0.3, k.c[1] + gauss() * 0.3, k.c[2] + gauss() * 0.3);
    from = qMesh.visible ? qMesh.position.clone() : new THREE.Vector3(0, 0, 0); target = p; t = reduce ? 1 : 0; qMesh.visible = true;
    const r = light(p);
    info.textContent = '"' + label + '" lands in ' + CL[r.top].name + ". " + r.count + " of its " + K + " nearest chunks come from there, so those are what a retriever would hand to the model.";
    if (reduce) qMesh.position.copy(p);
  }
  CL.forEach((k, ci) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = k.q;
    b.style.setProperty("--cc", "#" + new THREE.Color(k.color).getHexString());
    b.addEventListener("click", () => { [...chipsEl.children].forEach(c => c.setAttribute("aria-pressed", String(c === b))); ask(ci, k.q); });
    chipsEl.appendChild(b);
  });

  // legend
  const leg = box.querySelector(".vs-legend");
  leg.innerHTML = CL.map(k => '<span><span class="lang-dot" style="background:#' + new THREE.Color(k.color).getHexString() + '"></span>' + k.name + "</span>").join("");

  // drag to rotate
  let drag = false, lx = 0, ly = 0, vx = 0, vy = 0, idle = 0;
  canvas.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => { if (!drag) return; vy = (e.clientX - lx) * 0.006; vx = (e.clientY - ly) * 0.006; group.rotation.y += vy; group.rotation.x = Math.max(-1.1, Math.min(1.1, group.rotation.x + vx)); lx = e.clientX; ly = e.clientY; idle = 0; });
  const end = () => { drag = false; };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("keydown", e => { if (e.key === "ArrowLeft") group.rotation.y -= .15; if (e.key === "ArrowRight") group.rotation.y += .15; });

  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return false;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 520 ? 62 : 45; camera.updateProjectionMatrix(); return true;
  }
  new ResizeObserver(size).observe(canvas); addEventListener("resize", size);

  let visible = true; new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(canvas);
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = clock.getDelta(), el = clock.elapsedTime;
    if (!visible || document.hidden || !canvas.clientWidth) return;
    if (!reduce && !drag) group.rotation.y += 0.0016 + vy * 0.9, vy *= 0.94;
    if (t < 1) { t = Math.min(1, t + dt / 0.9); const e = 1 - Math.pow(1 - t, 3); qMesh.position.lerpVectors(from, target, e); }
    if (qMesh.visible) halo.scale.setScalar(1 + 0.25 * Math.sin(el * 3));
    renderer.render(scene, camera);
  }
  size(); ask(0, CL[0].q); chipsEl.children[0].setAttribute("aria-pressed", "true"); frame();
}
