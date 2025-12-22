import { storage } from "./storage.js";

const headers = () => ({
  "Content-Type": "application/json",
  "x-init-data": storage.getInitData()
});

export async function fetchCoins() {
  const res = await fetch("/api/coins", { headers: headers() });
  return res.json();
}

export async function spendCoin() {
  return fetch("/api/coins", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ action: "spend" })
  });
}

export async function submitScore(score) {
  return fetch("/api/scores", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ score })
  });
}

export async function buyCoins() {
  return fetch("/api/coins", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ action: "buy_mock" })
  });
}
