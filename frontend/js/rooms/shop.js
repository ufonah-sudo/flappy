import * as api from '../../api.js';

export function initShop() {
    const state = window.state;
    const updateGlobalUI = window.updateGlobalUI;
    const tg = window.Telegram?.WebApp;

    const container = document.querySelector('#scene-shop #shop-content');
    if (!container) return;

    // Генерируем контент магазина
    container.innerHTML = `
        <div class="shop-section">
            <h4 style="color: #f7d51d; margin-bottom: 12px; font-size: 14px; text-align: left;">💎 ПОПОЛНИТЬ БАЛАНС</h4>
            <div id="shop-ton-wallet" style="margin-bottom: 15px; display: flex; justify-content: center; min-height: 40px;"></div>
            
            <div class="shop-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="shop-card" style="background: rgba(255,255,255,0.07); padding: 15px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 32px; margin-bottom: 5px;">🪙</div>
                    <div style="font-weight: 800; font-size: 16px;">10 Монет</div>
                    <div style="font-size: 10px; color: #aaa; margin-bottom: 10px;">Старт</div>
                    <button class="buy-ton-btn primary-btn" data-amount="1" data-coins="10" style="width: 100%; margin: 0; padding: 10px; font-size: 14px;">1 TON</button>
                </div>
                <div class="shop-card" style="background: rgba(255,255,255,0.07); padding: 15px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 32px; margin-bottom: 5px;">💰</div>
                    <div style="font-weight: 800; font-size: 16px;">55 Монет</div>
                    <div style="font-size: 10px; color: #4ec0ca; margin-bottom: 10px;">+10% БОНУС</div>
                    <button class="buy-ton-btn primary-btn" data-amount="5" data-coins="55" style="width: 100%; margin: 0; padding: 10px; font-size: 14px;">5 TON</button>
                </div>
            </div>
        </div>

        <div class="shop-section" style="margin-top: 30px;">
            <h4 style="color: #f7d51d; margin-bottom: 12px; font-size: 14px; text-align: left;">⚡ СПОСОБНОСТИ</h4>
            <div class="shop-list" style="display: flex; flex-direction: column; gap: 10px;">
                <div class="shop-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.05);">
                    <div class="item-info" style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 28px; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 10px;">🧲</span>
                        <div style="text-align: left;">
                            <p style="margin: 0; font-weight: bold; font-size: 15px;">Магнит</p>
                            <p style="margin: 0; font-size: 12px; color: #f7d51d; font-weight: 800;">🪙 50</p>
                        </div>
                    </div>
                    <button class="buy-ingame-btn secondary-btn" data-item="magnet" data-price="50" style="margin: 0; padding: 8px 15px; width: auto; font-size: 12px;">КУПИТЬ</button>
                </div>
                </div>
        </div>
    `;

    // Безопасный рендер кнопки TON
    if (window.wallet && window.wallet.tonConnectUI) {
        try {
            window.wallet.tonConnectUI.setConnectButtonRoot('#shop-ton-wallet');
        } catch (e) {
            console.warn("[Shop] Ошибка привязки кнопки TON:", e);
        }
    }

    // 1. Обработка покупки за TON
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { amount, coins } = button.dataset;

            if (!window.wallet?.isConnected) {
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('warning');
                    tg.showConfirm("Кошелек не подключен. Перейти в настройки?", (ok) => {
                        if (ok) window.showRoom('settings');
                    });
                }
                return;
            }
            
            try {
                button.disabled = true;
                const originalText = button.innerText;
                button.innerHTML = `⏳...`;
                
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
                button.disabled = false;
            } catch (err) {
                console.error("Shop TON error:", err);
                button.disabled = false;
                button.innerText = `${amount} TON`;
                if (tg) tg.HapticFeedback.notificationOccurred('error');
            }
        };
    });

    // 2. Обработка покупки за монеты
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
                button.innerText = "⏳";
                
                // Вызов API для покупки предмета
                const res = await api.buyItem(item); 
                
                if (res && !res.error) {
                    state.coins = res.newBalance;
                    // Обновляем количество в state.powerups
                    if (state.powerups) {
                        state.powerups[item] = (state.powerups[item] || 0) + 1;
                    }
                    
                    if (window.updateGlobalUI) window.updateGlobalUI();
                    if (tg) tg.HapticFeedback.impactOccurred('medium');
                    
                    button.innerText = "ГОТОВО";
                    button.style.color = "#4ec0ca";
                    
                    setTimeout(() => {
                       initShop(); // Перерисовываем для сброса состояния кнопок
                    }, 1500);
                }
            } catch (err) {
                button.disabled = false;
                button.innerText = "КУПИТЬ";
                console.error("Buy item error:", err);
            }
        };
    });
}