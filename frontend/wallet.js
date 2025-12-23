export class WalletManager {
    constructor(onStatusChange) {
        // Используем window.TON_CONNECT_UI, так как библиотека из CDN
        const TonConnectUI = window.TON_CONNECT_UI.TonConnectUI;
        
        this.tonConnectUI = new TonConnectUI({
            // ВАЖНО: Замени на свой реальный домен Vercel!
            // Без корректного манифеста кошелек выдаст ошибку "Connection failed"
            manifestUrl: 'https://flappy-ton-bird.vercel.app/tonconnect-manifest.json', 
            buttonRootId: 'ton-connect'
        });

        this.tonConnectUI.onStatusChange(wallet => {
            onStatusChange(!!wallet);
        });
    }

    get isConnected() {
        return this.tonConnectUI.connected;
    }

    async sendTransaction(amountTon) {
        if (!this.isConnected) {
            return { success: false, error: 'Not connected' };
        }

        // Конвертация TON в NanoTON (1 TON = 1,000,000,000 NanoTON)
        const amountNano = Math.floor(amountTon * 1000000000); 
        
        const transaction = {
            // validUntil — время жизни транзакции в секундах (Unix timestamp)
            validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут на подтверждение
            messages: [
                {
                    // Твой проверенный адрес:
                    address: "UQDljPjQIiXzz4xAwzj1dRDFu_ZmNVpRd7--QNbT06IMXuVy", 
                    amount: amountNano.toString(),
                }
            ]
        };

        try {
            // Запуск окна оплаты в кошельке (TonKeeper и др.)
            const result = await this.tonConnectUI.sendTransaction(transaction);
            
            // Если мы получили boc (Bag of Cells), транзакция отправлена в сеть
            console.log("Transaction sent, BOC:", result.boc);
            return { success: true, boc: result.boc };
        } catch (e) {
            console.error("TON Transaction error:", e);
            // Обработка случая, если пользователь просто закрыл окно кошелька
            return { success: false, error: e.message || "User cancelled" };
        }
    }

    async disconnect() {
        try {
            await this.tonConnectUI.disconnect();
        } catch (e) {
            console.error("Disconnect error:", e);
        }
    }
}