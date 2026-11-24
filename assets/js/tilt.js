/* Pinned cards tilt towards the pointer. Skipped on touch and with reduced motion. */
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: none)").matches) return;
  document.querySelectorAll(".pin").forEach(function (c) {
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.classList.add("tilt"); c.style.transform = "rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 7).toFixed(2) + "deg) translateZ(6px)";
    });
    c.addEventListener("pointerleave", function () { c.classList.remove("tilt"); c.style.transform = ""; });
  });
})();
