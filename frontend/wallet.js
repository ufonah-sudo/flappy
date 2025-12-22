export const ton = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: "/tonconnect-manifest.json"
});

const statusEl = document.getElementById("wallet-status");
const btn = document.getElementById("connect-wallet-btn");

btn.onclick = async () => {
  await ton.connectWallet();
};

ton.onStatusChange(wallet => {
  statusEl.textContent = wallet
    ? "Wallet: connected"
    : "Wallet: not connected";
});

export function isWalletConnected() {
  return ton.wallet !== null;
}
