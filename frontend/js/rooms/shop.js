import * as api from '../../api.js';

export function initShop() {
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    const container = document.querySelector('#scene-shop #shop-content');

    if (!container) return;

    // Конфигурация способностей
    const powerups = [
        { id: 'heart',  name: 'СЕРДЦЕ', price: 50, icon: '❤️', desc: '+1 Жизнь' },
        { id: 'shield', name: 'ЩИТ',     price: 20, icon: '🛡️', desc: 'Защита от удара' },
        { id: 'gap',    name: 'ПРОЕМЫ',  price: 20, icon: '↔️', desc: 'Широкие трубы' },
        { id: 'magnet', name: 'МАГНИТ',  price: 30, icon: '🧲', desc: 'Ловит монеты' },
        { id: 'ghost',  name: 'ПРИЗРАК', price: 25, icon: '👻', desc: 'Сквозь стены' }
    ];

    container.innerHTML = `
        <!-- РАЗДЕЛ 1: МОНЕТЫ (TON) -->
        <div class="shop-section">
            <div class="shop-separator">
                <h4>💎 Монеты (TON)</h4>
            </div>
            
            <!-- Место для кнопки кошелька -->
            <div id="shop-ton-wallet" style="margin-bottom: 10px; display: flex; justify-content: center;"></div>
            
            <div class="shop-grid">
                <!-- Пакет 1 -->
                <div class="shop-card">
                    <div style="font-size: 32px; margin-bottom: 5px;">🟡</div>
                    <div style="font-weight: 800; font-size: 15px; color: #fff; text-shadow: 1px 1px 0 #000;">10 Монет</div>
                    <div style="font-size: 10px; color: #aaa;">Стартовый пак</div>
                    <button class="buy-ton-btn primary-btn" data-amount="1" data-coins="10" style="width: 100%; margin-top: 8px; font-size: 12px; padding: 8px;">1 TON</button>
                </div>

                <!-- Пакет 2 -->
                <div class="shop-card">
                    <div style="font-size: 32px; margin-bottom: 5px;">💰</div>
                    <div style="font-weight: 800; font-size: 15px; color: #fff; text-shadow: 1px 1px 0 #000;">55 Монет</div>
                    <div style="font-size: 10px; color: #f7d51d;">+10% Бонус</div>
                    <button class="buy-ton-btn primary-btn" data-amount="5" data-coins="55" style="width: 100%; margin-top: 8px; font-size: 12px; padding: 8px;">5 TON</button>
                </div>
            </div>
        </div>
        
        <!-- РАЗДЕЛ 2: СПОСОБНОСТИ (ЗА ИГРОВЫЕ МОНЕТЫ) -->
        <div class="shop-section">
            <div class="shop-separator" style="margin-top: 25px;">
                <h4>⚡ Способности</h4>
            </div>

            <div class="shop-list">
                ${powerups.map(p => `
                    <!-- Используем новый класс powerup-card -->
                    <div class="powerup-card">
                        <div style="display: flex; align-items: center;">
                            <div class="icon">${p.icon}</div>
                            <div>
                                <div class="name">${p.name}</div>
                                <div class="desc">${p.desc}</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                            <div class="powerup-price">🟡 ${p.price}</div>
                            <button class="buy-ingame-btn" data-id="${p.id}" data-price="${p.price}" 
                                style="
                                    background: #4ec0ca; 
                                    color: #fff; 
                                    border: none; 
                                    border-radius: 15px; 
                                    padding: 4px 12px; 
                                    font-size: 10px; 
                                    font-weight: 900; 
                                    margin-top: 4px;
                                    cursor: pointer;
                                    box-shadow: 0 2px 0 #2e8b94;
                                ">
                                КУПИТЬ
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Пустой блок, чтобы скролл не обрезал низ -->
        <div style="height: 40px;"></div>
    `;

    // --- ЛОГИКА (Остается прежней) ---
    
    // 1. Кнопка кошелька
    if (window.wallet?.tonConnectUI) {
        try { window.wallet.tonConnectUI.setConnectButtonRoot('#shop-ton-wallet'); } catch (e) {}
    }

    // 2. Обработчики TON
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { amount, coins } = button.dataset;
            
            if (!window.wallet?.isConnected) {
                tg?.HapticFeedback.notificationOccurred('warning');
                tg?.showConfirm("Кошелек не подключен. Перейти в настройки?", (ok) => {
                    if (ok) window.showRoom('settings');
                });
                return;
            }
            
            try {
                button.disabled = true;
                const originalText = button.innerText;
                button.innerText = "⏳";
                const tx = await window.wallet.sendTransaction(amount);
                if (tx) {
                    const res = await api.buyCoins(amount);
                    if (res && !res.error) {
                        state.coins = res.newBalance || (state.coins + parseInt(coins));
                        window.updateGlobalUI?.();
                        tg?.HapticFeedback.notificationOccurred('success');
                        tg?.showAlert(`Успешно! +${coins} монет.`);
                    }
                }
                button.innerText = originalText;
                button.disabled = false;
            } catch (err) {
                console.error(err);
                button.disabled = false;
                button.innerText = originalText;
            }
        };
    });

    // 3. Обработчики покупок за монеты
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { id, price } = button.dataset;
            const cost = parseInt(price);

            if (state.coins < cost) {
                tg?.HapticFeedback.notificationOccurred('error');
                // Визуально показываем ошибку на кнопке
                const oldColor = button.style.background;
                button.style.background = "#ff4f4f";
                button.innerText = "НЕТ 🟡";
                setTimeout(() => {
                    button.style.background = oldColor;
                    button.innerText = "КУПИТЬ";
                }, 1000);
                return;
            }

            try {
                button.disabled = true;
                button.innerText = "⏳";
                
                const res = await api.buyItem(id);
                
                if (res && !res.error) {
                    // Событие покупки
                    window.dispatchEvent(new CustomEvent('buy_item', {
                        detail: { id, price: cost, type: 'powerup', powerupType: id }
                    }));
                    
                    button.style.background = "#2ecc71"; // Зеленый
                    button.innerText = "✅";
                    
                    setTimeout(() => { initShop(); }, 1000);
                } else {
                    throw new Error("Ошибка");
                }
            } catch (err) {
                button.disabled = false;
                button.innerText = "КУПИТЬ";
            }
        };
    });
}
