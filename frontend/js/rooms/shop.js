import { state, updateGlobalUI } from '../../main.js';
import * as api from '../api.js';

export function initShop() {
    const container = document.querySelector('#scene-shop .room-content');
    if (!container) return;

    container.innerHTML = `
        <div class="shop-section">
            <h4>💰 ПОКУПКА МОНЕТ</h4>
            <div class="shop-grid">
                <div class="shop-card coin-pack">
                    <span class="pack-icon">🪙</span>
                    <span class="pack-amount">10</span>
                    <button class="buy-ton-btn" data-amount="1">1 TON</button>
                </div>
                <div class="shop-card coin-pack">
                    <span class="pack-icon">💰</span>
                    <span class="pack-amount">55</span>
                    <button class="buy-ton-btn" data-amount="5">5 TON</button>
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

    // 1. Обработка покупки за TON
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const amount = e.target.dataset.amount;
            if (!window.wallet?.isConnected) {
                alert("Сначала подключите кошелек в настройках!");
                return;
            }
            
            try {
                btn.disabled = true;
                btn.innerText = "⏳...";
                
                const tx = await window.wallet.sendTransaction(amount);
                if (tx) {
                    const res = await api.buyCoins(amount);
                    if (res && !res.error) {
                        state.coins = res.newBalance;
                        updateGlobalUI();
                        alert(`Успешно! +${amount * 10} монет`);
                    }
                }
            } catch (err) {
                console.error("Shop TON error:", err);
            } finally {
                btn.disabled = false;
                btn.innerText = `${amount} TON`;
            }
        };
    });

    // 2. Обработка покупки за монеты (Способности)
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const { item, price } = e.target.dataset;
            const cost = parseInt(price);

            if (state.coins < cost) {
                alert("Недостаточно монет!");
                return;
            }

            // Здесь будет вызов api.buyItem(item)
            alert(`Вы купили ${item}! Теперь он доступен в инвентаре.`);
            state.coins -= cost;
            updateGlobalUI();
        };
    });
}