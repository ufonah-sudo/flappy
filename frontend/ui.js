import { spendCoin, buyCoins } from "./api.js";
import { isWalletConnected } from "./wallet.js";

const gameOverModal = document.getElementById("gameover-modal");
const buyModal = document.getElementById("buy-modal");

export function showGameOver(score) {
  document.getElementById("final-score").textContent = score;
  gameOverModal.classList.remove("hidden");
}

export function hideGameOver() {
  gameOverModal.classList.add("hidden");
}

document.getElementById("continue-btn").onclick = async () => {
  const res = await spendCoin();
  if (!res.ok) {
    buyModal.classList.remove("hidden");
    return;
  }
  hideGameOver();
  window.resumeGame();
};

document.getElementById("restart-btn").onclick = () => {
  hideGameOver();
  window.restartGame();
};

document.getElementById("buy-coins-btn").onclick = async () => {
  if (!isWalletConnected()) {
    alert("Connect wallet first");
    return;
  }
  await buyCoins();
  buyModal.classList.add("hidden");
};

document.getElementById("close-buy-modal").onclick = () => {
  buyModal.classList.add("hidden");
};
