// ИСПРАВЛЕНО: Путь на два уровня вверх
import * as api from '../../api.js';

export function initShop() {
    const state = window.state;
    const updateGlobalUI = window.updateGlobalUI;
    const tg = window.Telegram?.WebApp;

    const container = document.querySelector('#scene-shop .room-content');
    if (!container) return;

    container.innerHTML = `
        <div class="shop-section">
            <h4 style="color: #f7d51d; margin-bottom: 10px;">💰 КУПИТЬ МОНЕТЫ</h4>
            <div class="shop-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="shop-card coin-pack" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 30px; margin-bottom: 5px;">🪙</div>
                    <div style="font-weight: bold; margin-bottom: 10px;">10 Монет</div>
                    <button class="buy-ton-btn primary-btn" data-amount="1" data-coins="10" style="width: 100%; margin: 0;">1 TON</button>
                </div>
                <div class="shop-card coin-pack" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 30px; margin-bottom: 5px;">💰</div>
                    <div style="font-weight: bold; margin-bottom: 10px;">55 Монет</div>
                    <button class="buy-ton-btn primary-btn" data-amount="5" data-coins="55" style="width: 100%; margin: 0;">5 TON</button>
                </div>
            </div>
        </div>

        <div class="shop-section" style="margin-top: 20px;">
            <h4 style="color: #f7d51d; margin-bottom: 10px;">⚡ СПОСОБНОСТИ</h4>
            <div class="shop-list">
                <div class="shop-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px;">
                    <div class="item-info" style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🧲</span>
                        <div>
                            <p style="margin: 0; font-weight: bold;">Магнит</p>
                            <p style="margin: 0; font-size: 12px; color: #aaa;">🪙 50</p>
                        </div>
                    </div>
                    <button class="buy-ingame-btn secondary-btn" data-item="magnet" data-price="50" style="margin: 0; padding: 8px 15px;">КУПИТЬ</button>
                </div>
            </div>
        </div>
    `;

    // 1. Покупка за TON
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { amount, coins } = button.dataset;

            if (!window.wallet?.isConnected) {
                if (tg) tg.showAlert("Сначала подключите кошелек в настройках!");
                return;
            }
            
            try {
                button.disabled = true;
                const originalText = button.innerText;
                button.innerHTML = `⏳`;
                
                const tx = await window.wallet.sendTransaction(amount);
                
                if (tx) {
                    const res = await api.buyCoins(amount);
                    if (res && !res.error) {
                        state.coins = res.newBalance;
                        if (window.updateGlobalUI) window.updateGlobalUI();
                        if (tg) {
                            tg.HapticFeedback.notificationOccurred('success');
                            tg.showAlert(`Успешно! Получено ${coins} монет.`);
                        }
                    }
                }
                button.innerText = originalText;
            } catch (err) {
                console.error("Shop TON error:", err);
                button.disabled = false;
                button.innerText = `${amount} TON`;
            }
        };
    });

    // 2. Покупка за монеты
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { item, price } = button.dataset;
            const cost = parseInt(price);

            if (state.coins < cost) {
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('error');
                    tg.showAlert("Недостаточно монет!");
                }
                return;
            }

            try {
                button.disabled = true;
                // Здесь будет: await api.buyItem(item);
                state.coins -= cost;
                if (window.updateGlobalUI) window.updateGlobalUI();
                
                if (tg) {
                    tg.HapticFeedback.impactOccurred('medium');
                    tg.showAlert(`Куплено: ${item}`);
                }
                button.innerText = "ГОТОВО";
            } catch (err) {
                button.disabled = false;
                console.error("Buy item error:", err);
            }
        };
    });
}