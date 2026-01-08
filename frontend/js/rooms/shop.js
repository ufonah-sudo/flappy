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

    // --- HTML СТРУКТУРА С ВКЛАДКАМИ ---
    container.innerHTML = `
        <!-- 1. КНОПКИ ПЕРЕКЛЮЧЕНИЯ (TABS) -->
        <div class="shop-tabs">
            <button class="shop-tab-btn active" data-target="tab-coins">МОНЕТЫ</button>
            <button class="shop-tab-btn" data-target="tab-powers">СИЛЫ</button>
        </div>

        <!-- 2. РАЗДЕЛ: МОНЕТЫ (TON) -->
        <div id="tab-coins" class="shop-tab-content active-view">
            <div id="shop-ton-wallet" style="margin-bottom: 15px; display: flex; justify-content: center;"></div>
            
            <div class="shop-grid">
                <!-- Пакет 1 -->
                <div class="shop-card">
                    <div style="font-size: 32px; margin-bottom: 5px;">🟡</div>
                    <div style="font-weight: 800; font-size: 15px; color: #fff; text-shadow: 1px 1px 0 #000;">10 Монет</div>
                    <div style="font-size: 10px; color: #aaa;">Старт</div>
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
        
        <!-- 3. РАЗДЕЛ: СПОСОБНОСТИ (Powers) -->
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
    `;

    // --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ---
    const tabs = container.querySelectorAll('.shop-tab-btn');
    const contents = container.querySelectorAll('.shop-tab-content');

    tabs.forEach(tab => {
        tab.onclick = () => {
            // 1. Убираем активность со всех
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-view'));

            // 2. Активируем нажатую
            tab.classList.add('active');
            
            // 3. Показываем нужный контент
            const targetId = tab.dataset.target;
            document.getElementById(targetId).classList.add('active-view');
            
            // Вибрация при переключении
            if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        };
    });

    // --- ЛОГИКА КОШЕЛЬКА ---
    if (window.wallet?.tonConnectUI) {
        try { window.wallet.tonConnectUI.setConnectButtonRoot('#shop-ton-wallet'); } catch (e) {}
    }

    // --- ОБРАБОТЧИКИ (TON) ---
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

    // --- ОБРАБОТЧИКИ (Способности) ---
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
                    window.dispatchEvent(new CustomEvent('buy_item', {
                        detail: { id, price: cost, type: 'powerup', powerupType: id }
                    }));
                    
                    button.style.background = "#2ecc71"; 
                    button.innerText = "✅";
                    
                    // Обновляем магазин через секунду (с сохранением открытой вкладки можно, но пока просто реинит)
                    setTimeout(() => { 
                       // Если хочешь, чтобы оставалась та же вкладка, тут нужна доп логика.
                       // Пока просто обновим UI:
                       button.style.background = "#4ec0ca";
                       button.innerText = "КУПИТЬ";
                       button.disabled = false;
                    }, 1000);
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
