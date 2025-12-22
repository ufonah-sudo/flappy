let canvas, ctx;
let birdY = 250;
let velocity = 0;
let score = 0;
let running = true;

export function startGame() {
  canvas = document.getElementById("game-canvas");
  if (!canvas) return console.error("Canvas не найден!");
  ctx = canvas.getContext("2d");

  // HUD
  document.getElementById("score").textContent = score;

  // Клик для прыжка
  canvas.addEventListener("click", () => {
    velocity = -8;
    score++;
    document.getElementById("score").textContent = score;
  });

  // Кнопка Restart
  document.getElementById("restart-btn").addEventListener("click", () => {
    birdY = 250;
    velocity = 0;
    score = 0;
    running = true;
    document.getElementById("score").textContent = score;
    document.getElementById("gameover-modal").classList.add("hidden");
    draw();
  });

  running = true;
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Птица
  ctx.beginPath();
  ctx.arc(80, birdY, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();

  // Гравитация
  birdY += velocity;
  velocity += 0.6;

  // Проверка границ
  if (birdY > canvas.height || birdY < 0) return endGame();

  // Score
  ctx.fillStyle = "#000";
  ctx.font = "16px Arial";
  ctx.fillText(`Score: ${score}`, 10, 20);

  if (running) requestAnimationFrame(draw);
}

function endGame() {
  running = false;
  document.getElementById("final-score").textContent = score;
  document.getElementById("gameover-modal").classList.remove("hidden");
}
