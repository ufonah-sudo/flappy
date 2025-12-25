import * as api from '../api.js';

export function initShop() {
    // Берем глобальные переменные из окна
    const state = window.state;
    const updateGlobalUI = window.updateGlobalUI;
    const tg = window.Telegram?.WebApp;

    const container = document.querySelector('#scene-shop .room-content');
    if (!container) return;

    container.innerHTML = `
        <div class="shop-section">
            <h4>💰 КУПИТЬ МОНЕТЫ</h4>
            <div class="shop-grid">
                <div class="shop-card coin-pack">
                    <span class="pack-icon">🪙</span>
                    <span class="pack-amount">10</span>
                    <button class="buy-ton-btn" data-amount="1" data-coins="10">1 TON</button>
                </div>
                <div class="shop-card coin-pack">
                    <span class="pack-icon">💰</span>
                    <span class="pack-amount">55</span>
                    <button class="buy-ton-btn" data-amount="5" data-coins="55">5 TON</button>
                </div>
            </div>
        </div>

        <div class="shop-section">
            <h4>⚡ СПОСОБНОСТИ</h4>
            <div class="shop-list">
                <div class="shop-item">
                    <div class="item-info">
                        <span class="item-icon">🧲</span>
                        <div>
                            <p class="item-title">Магнит</p>
                            <p class="item-price">🪙 50</p>
                        </div>
                    </div>
                    <button class="buy-ingame-btn" data-item="magnet" data-price="50">КУПИТЬ</button>
                </div>
            </div>
        </div>
    `;

    // 1. Покупка за TON
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const amount = e.target.dataset.amount;
            const coinsToReceive = e.target.dataset.coins;

            if (!window.wallet?.isConnected) {
                if (tg) tg.showAlert("Сначала подключите кошелек в настройках!");
                else alert("Сначала подключите кошелек!");
                return;
            }
            
            try {
                btn.disabled = true;
                btn.innerHTML = `<span class="spinner">⏳</span>`;
                
                // Вызываем транзакцию через WalletManager
                const tx = await window.wallet.sendTransaction(amount);
                
                if (tx) {
                    // Если транзакция в блокчейне ок, уведомляем наш бэкенд
                    const res = await api.buyCoins(amount);
                    if (res && !res.error) {
                        state.coins = res.newBalance;
                        if (typeof updateGlobalUI === 'function') updateGlobalUI();
                        
                        if (tg) {
                            tg.HapticFeedback.notificationOccurred('success');
                            tg.showPopup({
                                title: 'Успешно!',
                                message: `Баланс пополнен на ${coinsToReceive} монет`,
                                buttons: [{ type: 'ok' }]
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Shop TON error:", err);
                if (tg) tg.showAlert("Ошибка при оплате. Попробуйте еще раз.");
            } finally {
                btn.disabled = false;
                btn.innerText = `${amount} TON`;
            }
        };
    });

    // 2. Покупка за игровые монеты
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const { item, price } = e.target.dataset;
            const cost = parseInt(price);

            if (state.coins < cost) {
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('error');
                    tg.showAlert("Недостаточно монет! Играй больше или загляни в раздел TON.");
                } else {
                    alert("Недостаточно монет!");
                }
                return;
            }

            try {
                btn.disabled = true;
                // В будущем: const res = await api.buyItem(item);
                
                state.coins -= cost;
                if (typeof updateGlobalUI === 'function') updateGlobalUI();
                
                if (tg) {
                    tg.HapticFeedback.impactOccurred('medium');
                    tg.showAlert(`Вы купили ${item}! Предмет добавлен в инвентарь.`);
                }
                
                btn.innerText = "КУПЛЕНО";
                btn.classList.add('purchased');
            } catch (err) {
                btn.disabled = false;
                console.error("Buy item error:", err);
            }
        };
    });
}