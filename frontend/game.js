import { submitScore, fetchCoins } from "./api.js";
import { showGameOver } from "./ui.js";

let canvas, ctx;
let birdY = 250;
let velocity = 0;
let score = 0;
let running = true;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // bird
  ctx.beginPath();
  ctx.arc(80, birdY, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();

  birdY += velocity;
  velocity += 0.6;

  if (birdY > canvas.height || birdY < 0) endGame();

  // score
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText(`Score: ${score}`, 10, 20);

  if (running) requestAnimationFrame(draw);
}

function endGame() {
  running = false;
  submitScore(score);
  showGameOver(score);
}

window.restartGame = () => {
  birdY = 250;
  velocity = 0;
  score = 0;
  running = true;
  draw();
};

window.resumeGame = () => {
  if (!running) {
    running = true;
    draw();
  }
};

export async function startGame() {
  canvas = document.getElementById("game-canvas");
  if (!canvas) return console.error("Canvas not found!");
  ctx = canvas.getContext("2d");

  const data = await fetchCoins();
  document.getElementById("coins").textContent = data.coins;

  // клик для прыжка
  canvas.addEventListener("click", () => {
    velocity = -8;
    score++;
    document.getElementById("score").textContent = score;
  });

  draw();
}
