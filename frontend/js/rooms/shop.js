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

    // --- HTML СТРУКТУРА ---
    container.innerHTML = `
        <!-- ВКЛАДКИ -->
        <div class="shop-tabs">
            <button class="shop-tab-btn active" data-target="tab-coins">МАГАЗИН</button>
            <button class="shop-tab-btn" data-target="tab-powers">СИЛЫ</button>
        </div>

        <!-- ВКЛАДКА 1: ПОКУПКИ ЗА TON (Теперь белые карточки!) -->
        <div id="tab-coins" class="shop-tab-content active-view">
            
            <!-- Кнопка кошелька (Дубликат из настроек) -->
            <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 15px;">
                <div id="shop-ton-wallet"></div>
            </div>
            
            <div class="shop-list">
                
                <!-- ТОВАР 1: 10,000 МОНЕТ ЗА 1 TON -->
                <div class="powerup-card">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">🟡</div>
                        <div>
                            <div class="name">10,000 МОНЕТ</div>
                            <div class="desc">Гигантский запас</div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <button class="buy-ton-btn" data-type="coins_10k" data-amount="1" 
                            style="background: #0098ea; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 0 #0077b5;">
                            1 TON
                        </button>
                    </div>
                </div>

                <!-- ТОВАР 2: 10 ЭНЕРГИИ ЗА 1 TON -->
                <div class="powerup-card">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">⚡</div>
                        <div>
                            <div class="name">10 ЭНЕРГИИ</div>
                            <div class="desc">Для игры</div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <button class="buy-ton-btn" data-type="energy_10" data-amount="1" 
                            style="background: #0098ea; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 0 #0077b5;">
                            1 TON
                        </button>
                    </div>
                </div>

            </div>
        </div>
        
        <!-- ВКЛАДКА 2: СПОСОБНОСТИ (Powers) -->
        <div id="tab-powers" class="shop-tab-content">
            <div class="shop-list">
                ${powerups.map(p => `
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
                                style="background: #4ec0ca; color: #fff; border: none; border-radius: 15px; padding: 4px 12px; font-size: 10px; font-weight: 900; margin-top: 4px; cursor: pointer; box-shadow: 0 2px 0 #2e8b94;">
                                КУПИТЬ
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div style="height: 40px;"></div>
    `;

    // --- ЛОГИКА ---

    // 1. Вкладки
    const tabs = container.querySelectorAll('.shop-tab-btn');
    const contents = container.querySelectorAll('.shop-tab-content');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-view'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active-view');
            if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        };
    });

    // 2. Кошелек
    if (window.wallet && window.wallet.tonConnectUI) {
        try { window.wallet.tonConnectUI.setConnectButtonRoot('shop-ton-wallet'); } catch (e) {}
    }

    // 3. Обработчик TON (ОБНОВЛЕННЫЙ)
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { amount, type } = button.dataset; // type: coins_10k или energy_10
            
            if (!window.wallet?.isConnected) {
                tg?.showAlert("Сначала подключи кошелек!");
                return;
            }
            
            try {
                button.disabled = true;
                const originalText = button.innerText;
                button.innerText = "⏳";
                
                // Отправляем транзакцию
                const tx = await window.wallet.sendTransaction(amount);
                
                if (tx && tx.success) {
                    // Зовем новый API метод
                    // В api.js это будет тот же buyCoins, но мы передадим type
                    const res = await api.apiRequest('coins', 'POST', { 
                        action: 'buy_package', 
                        packageType: type,
                        amountTon: amount
                    });

                    if (res && !res.error) {
                        state.coins = res.newCoins || state.coins;
                        state.crystals = res.newCrystals || state.crystals; // Это Энергия
                        
                        window.updateGlobalUI?.();
                        tg?.HapticFeedback.notificationOccurred('success');
                        tg?.showAlert("Покупка успешна!");
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

    // 4. Обработчик способностей (Без изменений)
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { id, price } = button.dataset;
            const cost = parseInt(price);

            if (state.coins < cost) {
                tg?.HapticFeedback.notificationOccurred('error');
                const oldColor = button.style.background;
                button.style.background = "#ff4f4f";
                button.innerText = "НЕТ 🟡";
                setTimeout(() => { button.style.background = oldColor; button.innerText = "КУПИТЬ"; }, 1000);
                return;
            }
            try {
                button.disabled = true;
                button.innerText = "⏳";
                const res = await api.buyItem(id);
                if (res && !res.error) {
                    window.dispatchEvent(new CustomEvent('buy_item', { detail: { id, price: cost, type: 'powerup', powerupType: id } }));
                    button.style.background = "#2ecc71"; button.innerText = "✅";
                    setTimeout(() => { initShop(); }, 1000);
                }
            } catch (err) { button.disabled = false; button.innerText = "КУПИТЬ"; }
        };
    });
}
