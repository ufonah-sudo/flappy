/**
 * js/rooms/shop.js - ЛОГИКА МАГАЗИНА (BEAUTIFUL VERSION)
 */

import * as api from '../../api.js';

// Запоминаем вкладку, чтобы не сбрасывалась при покупке
let currentActiveTab = 'tab-bank';

export function initShop() {
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    const container = document.querySelector('#scene-shop #shop-content');

    if (!container) return;

    // Конфиг способностей
    const powerups = [
        { id: 'heart',  name: 'СЕРДЦЕ', price: 50, icon: '❤️', desc: '+1 Жизнь' },
        { id: 'shield', name: 'ЩИТ',     price: 20, icon: '🛡️', desc: 'Защита' },
        { id: 'gap',    name: 'ПРОЕМЫ',  price: 20, icon: '↔️', desc: 'Широкие трубы' },
        { id: 'magnet', name: 'МАГНИТ',  price: 30, icon: '🧲', desc: 'Ловит монеты' },
        { id: 'ghost',  name: 'ПРИЗРАК', price: 25, icon: '👻', desc: 'Сквозь стены' }
    ];

    // --- 1. HTML РАЗМЕТКА (С Вкладками) ---
    container.innerHTML = `
        <!-- Вкладки -->
        <div class="shop-tabs">
            <button class="shop-tab-btn ${currentActiveTab === 'tab-bank' ? 'active' : ''}" data-target="tab-bank">БАНК</button>
            <button class="shop-tab-btn ${currentActiveTab === 'tab-powers' ? 'active' : ''}" data-target="tab-powers">СИЛЫ</button>
        </div>

        <!-- ВКЛАДКА 1: БАНК (TON + Обмен) -->
        <div id="tab-bank" class="shop-tab-content ${currentActiveTab === 'tab-bank' ? 'active-view' : ''}">
            
            <!-- Место для кнопки кошелька -->
            <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 15px;">
                <div id="shop-ton-wallet" style="min-height: 40px;"></div>
            </div>
            
            <div class="shop-list">
                <!-- 1. КРИСТАЛЛЫ ЗА TON -->
                <!-- Используем стиль powerup-card (белый овал), но с синей рамкой для TON -->
                <div class="powerup-card" style="border-color: #0098ea;">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">💎</div>
                        <div>
                            <div class="name">10 КРИСТАЛЛОВ</div>
                            <div class="desc">Премиум валюта</div>
                        </div>
                    </div>
                    <button class="buy-ton-btn" data-type="crystals_10" data-amount="1" 
                        style="background: #0098ea; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 0 #0077b5;">
                        1 TON
                    </button>
                </div>

                <!-- 2. МОНЕТЫ ЗА TON -->
                <div class="powerup-card" style="border-color: #ffd700;">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">🟡</div>
                        <div>
                            <div class="name">10,000 МОНЕТ</div>
                            <div class="desc">Золотой запас</div>
                        </div>
                    </div>
                    <button class="buy-ton-btn" data-type="coins_10k" data-amount="1" 
                        style="background: #0098ea; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 0 #0077b5;">
                        1 TON
                    </button>
                </div>

                <!-- 3. ОБМЕН (Кристаллы -> Энергия) -->
                <!-- Желтоватый фон для выделения -->
                <div class="powerup-card" style="background: #fffbe6 !important; border-color: #f7d51d !important;">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">⚡</div>
                        <div>
                            <div class="name">5 ЭНЕРГИИ</div>
                            <div class="desc">Зарядись!</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 9px; color: #666; margin-bottom: 3px;">Цена:</div>
                        <button class="exchange-btn" 
                            style="background: #9b59b6; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 0 #8e44ad;">
                            1 💎
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- ВКЛАДКА 2: СПОСОБНОСТИ (За монеты) -->
        <div id="tab-powers" class="shop-tab-content ${currentActiveTab === 'tab-powers' ? 'active-view' : ''}">
            <div class="shop-list">
                ${powerups.map(p => `
                    <!-- Белые овалы для способностей -->
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

    // --- 2. ЛОГИКА ---

    // А) Переключение вкладок
    const tabs = container.querySelectorAll('.shop-tab-btn');
    const contents = container.querySelectorAll('.shop-tab-content');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-view'));
            
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            document.getElementById(targetId).classList.add('active-view');
            currentActiveTab = targetId; // Запоминаем
        };
    });

    // Б) Кошелек
    setTimeout(() => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try { 
                window.wallet.tonConnectUI.setConnectButtonRoot('shop-ton-wallet'); 
            } catch (e) { console.warn("Wallet UI error:", e); }
        }
    }, 100);

    // В) Покупка за TON
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { amount, type } = button.dataset;
            
            if (!window.wallet?.isConnected) {
                tg?.showAlert("Подключи кошелек!");
                return;
            }
            try {
                button.disabled = true;
                button.innerText = "⏳";
                const tx = await window.wallet.sendTransaction(amount);
                
                if (tx && tx.success) {
                    const res = await api.apiRequest('coins', 'POST', { 
                        action: 'buy_package', 
                        packageType: type 
                    });
                    
                    if (res && !res.error) {
                        state.coins = res.newCoins ?? state.coins;
                        state.crystals = res.newCrystals ?? state.crystals;
                        window.updateGlobalUI?.();
                        tg?.showAlert("Успешно!");
                    }
                }
                button.innerText = amount + " TON";
                button.disabled = false;
            } catch (err) {
                button.disabled = false;
                button.innerText = amount + " TON";
            }
        };
    });

    // Г) Обмен (Кристаллы -> Энергия)
    container.querySelectorAll('.exchange-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            if (state.crystals < 1) {
                tg?.HapticFeedback.notificationOccurred('error');
                tg?.showAlert("Не хватает кристаллов!");
                return;
            }
            try {
                button.disabled = true;
                button.innerText = "⏳";
                const res = await api.apiRequest('coins', 'POST', { action: 'exchange_crystals' });
                
                if (res && !res.error) {
                    state.crystals = res.newCrystals;
                    state.lives = res.newLives;
                    window.updateGlobalUI?.();
                    tg?.HapticFeedback.notificationOccurred('success');
                    
                    button.innerText = "✅";
                    setTimeout(() => { button.innerText = "1 💎"; button.disabled = false; }, 1000);
                } else {
                    throw new Error(res.error || "Ошибка");
                }
            } catch (err) {
                button.disabled = false;
                button.innerText = "1 💎";
            }
        };
    });

    // Д) Покупка Способностей
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
                    window.dispatchEvent(new CustomEvent('buy_item', { 
                        detail: { id, price: cost, type: 'powerup', powerupType: id } 
                    }));
                    button.innerText = "✅";
                    setTimeout(() => initShop(), 1000); // Реинит (вкладка сохранится)
                }
            } catch (err) { 
                button.disabled = false; 
                button.innerText = "КУПИТЬ"; 
            }
        };
    });
}