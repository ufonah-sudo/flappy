export class WalletManager {
    constructor(onStatusChange) {
        // Убедись, что ссылка на Vercel совпадает с реальностью!
        this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://твой-проект.vercel.app/tonconnect-manifest.json', 
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
        if (!this.isConnected) return { success: false, error: 'Not connected' };

        const amountNano = Math.floor(amountTon * 1000000000); 
        
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 120, // Увеличил до 120 сек для спокойствия игрока
            messages: [
                {
                    // ВСТАВЬ СВОЙ АДРЕС ТУТ:
                    address: "UQDljPjQIiXzz4xAwzj1dRDFu_ZmNVpRd7--QNbT06IMXuVy", 
                    amount: amountNano.toString(),
                }
            ]
        };

        try {
            // Telegram WebApp покажет лоадер, пока пользователь подтверждает в кошельке
            const result = await this.tonConnectUI.sendTransaction(transaction);
            
            // boc - это подтверждение транзакции
            return { success: true, boc: result.boc };
        } catch (e) {
            console.error("TON Transaction error:", e);
            return { success: false, error: e.message };
        }
    }

    async disconnect() {
        await this.tonConnectUI.disconnect();
    }
}