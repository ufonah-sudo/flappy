/**
 * Менеджер для работы с TON Connect UI (Robust Version)
 */
export class WalletManager {
    constructor() {
        this.tonConnectUI = null;
        this.init();
    }

    init() {
        // Проверяем, загрузилась ли библиотека глобально
        if (!window.TON_CONNECT_UI) {
            console.warn("[TON] Library not ready yet. Waiting...");
            // Если нет, пробуем еще раз через 500мс (на случай медленного интернета)
            setTimeout(() => this.init(), 500);
            return;
        }

        try {
            const TonConnectUI = window.TON_CONNECT_UI.TonConnectUI;
            
            this.tonConnectUI = new TonConnectUI({
                manifestUrl: 'https://flappy-ton-bird.vercel.app/tonconnect-manifest.json', 
                // Не указываем buttonRootId сразу, мы будем назначать его вручную в настройках
                uiOptions: {
                    twaReturnUrl: 'https://t.me/FlappyTonBird_bot/app'
                }
            });

            console.log("[TON] Wallet Initialized Successfully!");
            
            // Подписка на статус
            this.tonConnectUI.onStatusChange(wallet => {
                const connected = !!wallet;
                console.log(`[TON] Status: ${connected ? 'Connected' : 'Disconnected'}`);
                // Можно добавить обновление UI
                if(window.updateGlobalUI) window.updateGlobalUI();
            });

        } catch (e) {
            console.error("[TON] Init Error:", e);
        }
    }

    get isConnected() {
        return this.tonConnectUI && this.tonConnectUI.connected;
    }

    get walletAddress() {
        return this.tonConnectUI?.account?.address || null;
    }

    async sendTransaction(amountTon) {
        if (!this.isConnected) return { success: false, error: 'Wallet not connected' };

        const amountNano = (BigInt(Math.floor(amountTon * 1000000)) * 1000n).toString();

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300, 
            messages: [
                {
                    address: "UQDljPjQIiXzz4xAwzj1dRDFu_ZmNVpRd7--QNbT06IMXuVy", 
                    amount: amountNano,
                }
            ]
        };

        try {
            const result = await this.tonConnectUI.sendTransaction(transaction);
            return { success: true, boc: result.boc };
        } catch (e) {
            return { success: false, error: e.message || "Cancelled" };
        }
    }

    async disconnect() {
        if (this.isConnected) await this.tonConnectUI.disconnect();
    }
}
