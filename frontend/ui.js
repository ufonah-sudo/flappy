export function showGameOver(score) {
  const modal = document.getElementById("gameover-modal");
  document.getElementById("final-score").textContent = score;
  modal.classList.remove("hidden");
}
