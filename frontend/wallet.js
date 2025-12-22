export async function initWallet() {
  const btn = document.getElementById("connect-wallet-btn");
  const status = document.getElementById("wallet-status");

  btn.addEventListener("click", async () => {
    status.textContent = "Wallet connected";
    btn.disabled = true;
  });
}
