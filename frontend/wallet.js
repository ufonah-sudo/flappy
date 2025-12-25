/**
 * Менеджер для работы с TON Connect UI
 */
export class WalletManager {
    constructor(onStatusChange) {
        // Проверка наличия библиотеки (подключена через CDN в index.html)
        if (!window.TON_CONNECT_UI) {
            console.error("TON Connect UI library not found. Check your CDN script tag.");
            return;
        }

        const TonConnectUI = window.TON_CONNECT_UI.TonConnectUI;
        
        this.tonConnectUI = new TonConnectUI({
            // ВАЖНО: Манифест должен быть доступен по прямой ссылке.
            manifestUrl: 'https://flappy-ton-bird.vercel.app/tonconnect-manifest.json', 
            buttonRootId: 'ton-connect',
            // Настройки интерфейса для лучшего опыта в Telegram
            uiOptions: {
                twaReturnUrl: 'https://t.me/твой_бот_username/app' // Замени на ссылку своего бота
            }
        });

        // Подписываемся на изменения статуса кошелька
        this.tonConnectUI.onStatusChange(wallet => {
            const connected = !!wallet;
            console.log(`[💎 TON] Wallet state changed: ${connected ? 'Connected' : 'Disconnected'}`);
            onStatusChange(connected);
        });
    }

    /**
     * Возвращает текущее состояние подключения
     */
    get isConnected() {
        return this.tonConnectUI.connected;
    }

    /**
     * Получает адрес подключенного кошелька
     */
    get walletAddress() {
        return this.tonConnectUI.account?.address || null;
    }

    /**
     * Отправка транзакции на оплату
     * @param {number} amountTon - Сумма в TON (например 0.5)
     */
    async sendTransaction(amountTon) {
        if (!this.isConnected) {
            return { success: false, error: 'Wallet not connected' };
        }

        // Конвертация в NanoTON (надежный способ без ошибок плавающей точки)
        // 1 TON = 1,000,000,000 NanoTON
        const amountNano = (BigInt(Math.floor(amountTon * 1000000)) * 1000n).toString();
        
        const transaction = {
            // Время жизни транзакции: 5 минут
            validUntil: Math.floor(Date.now() / 1000) + 300, 
            messages: [
                {
                    // Адрес получателя (твой кошелек)
                    address: "UQDljPjQIiXzz4xAwzj1dRDFu_ZmNVpRd7--QNbT06IMXuVy", 
                    amount: amountNano,
                }
            ]
        };

        try {
            console.log(`[💎 TON] Requesting payment for ${amountTon} TON...`);
            
            // Запуск окна подтверждения в кошельке
            const result = await this.tonConnectUI.sendTransaction(transaction);
            
            // result.boc - это подтверждение, которое нужно отправить на сервер для проверки
            console.log("[💎 TON] Transaction sent successfully!");
            
            return { 
                success: true, 
                boc: result.boc 
            };
        } catch (e) {
            let errorMsg = "User cancelled";
            
            if (e instanceof Error) {
                errorMsg = e.message;
            } else if (typeof e === 'string') {
                errorMsg = e;
            }

            console.warn("[💎 TON] Transaction failed or cancelled:", errorMsg);
            
            return { 
                success: false, 
                error: errorMsg 
            };
        }
    }

    /**
     * Отключение кошелька
     */
    async disconnect() {
        try {
            if (this.isConnected) {
                await this.tonConnectUI.disconnect();
                console.log("[💎 TON] Disconnected manualy");
            }
        } catch (e) {
            console.error("[💎 TON] Disconnect error:", e);
        }
    }
}