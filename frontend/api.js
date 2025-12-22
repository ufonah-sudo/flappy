export async function fetchCoins() {
  return { coins: 1 };
}

export async function spendCoin() {
  console.log("Coin spent");
  return true;
}
