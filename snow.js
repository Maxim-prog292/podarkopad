const snowCanvas = document.getElementById("snow");
const sctx = snowCanvas.getContext("2d");
let snowflakes = [];
function resizeSnow() {
  snowCanvas.width = window.innerWidth;
  snowCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeSnow);
resizeSnow();
for (let i = 0; i < 120; i++) {
  snowflakes.push({
    x: Math.random() * snowCanvas.width,
    y: Math.random() * snowCanvas.height,
    r: Math.random() * 3 + 1,
    vy: Math.random() * 1 + 0.5,
  });
}

function snowLoop() {
  sctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
  sctx.fillStyle = "rgba(255,255,255,0.8)";
  for (const f of snowflakes) {
    sctx.beginPath();
    sctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    sctx.fill();
    f.y += f.vy;
    if (f.y > snowCanvas.height) f.y = -5;
  }
  requestAnimationFrame(snowLoop);
}
snowLoop();
