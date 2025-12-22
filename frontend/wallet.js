export class WalletManager {
    constructor(onStatusChange) {
        this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://your-vercel-app.vercel.app/tonconnect-manifest.json', // Заменить на свой!
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
        const amountNano = amountTon * 1000000000; // to nanotons
        
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sec
            messages: [
                {
                    address: "UQ...YOUR_WALLET_ADDRESS...", // ВАШ КОШЕЛЕК
                    amount: amountNano.toString(),
                }
            ]
        };

        try {
            const result = await this.tonConnectUI.sendTransaction(transaction);
            return { success: true, boc: result.boc };
        } catch (e) {
            console.error(e);
            return { success: false };
        }
    }
}