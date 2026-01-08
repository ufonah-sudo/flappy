/**
 * js/rooms/shop.js - ЛОГИКА МАГАЗИНА
 * Управляет вкладками (Банк/Силы), покупкой за TON, обменом Кристаллов и покупкой Способностей.
 */

// Импортируем методы для общения с сервером
import * as api from '../../api.js';

export function initShop() {
    // Получаем глобальное состояние и объект Telegram
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    // Находим контейнер магазина в HTML
    const container = document.querySelector('#scene-shop #shop-content');

    // Если контейнера нет (ошибка верстки), выходим
    if (!container) return;

    // Конфигурация способностей (Товары за монеты)
    const powerups = [
        { id: 'heart',  name: 'СЕРДЦЕ', price: 50, icon: '❤️', desc: '+1 Жизнь' },
        { id: 'shield', name: 'ЩИТ',     price: 20, icon: '🛡️', desc: 'Защита' },
        { id: 'gap',    name: 'ПРОЕМЫ',  price: 20, icon: '↔️', desc: 'Широкие трубы' },
        { id: 'magnet', name: 'МАГНИТ',  price: 30, icon: '🧲', desc: 'Ловит монеты' },
        { id: 'ghost',  name: 'ПРИЗРАК', price: 25, icon: '👻', desc: 'Сквозь стены' }
    ];

    // --- 1. ОТРИСОВКА ИНТЕРФЕЙСА (HTML) ---
    container.innerHTML = `
        <!-- Переключатели вкладок (Банк / Силы) -->
        <div class="shop-tabs">
            <button class="shop-tab-btn active" data-target="tab-bank">БАНК</button>
            <button class="shop-tab-btn" data-target="tab-powers">СИЛЫ</button>
        </div>

        <!-- ВКЛАДКА 1: БАНК (Покупки за TON и Обмен) -->
        <div id="tab-bank" class="shop-tab-content active-view">
            <!-- Место для кнопки кошелька -->
            <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 10px;">
                <div id="shop-ton-wallet"></div>
            </div>
            
            <div class="shop-list">
                <!-- ТОВАР: 10 КРИСТАЛЛОВ ЗА 1 TON -->
                <div class="powerup-card" style="border-color: #4ec0ca;">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">💎</div>
                        <div>
                            <div class="name">10 КРИСТАЛЛОВ</div>
                            <div class="desc">Премиум валюта</div>
                        </div>
                    </div>
                    <!-- Кнопка вызывает buy_package с типом crystals_10 -->
                    <button class="buy-ton-btn" data-type="crystals_10" data-amount="1" 
                        style="background: #0098ea; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer;">
                        1 TON
                    </button>
                </div>

                <!-- ТОВАР: 10,000 МОНЕТ ЗА 1 TON -->
                <div class="powerup-card">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">🟡</div>
                        <div>
                            <div class="name">10,000 МОНЕТ</div>
                            <div class="desc">Золотой запас</div>
                        </div>
                    </div>
                    <!-- Кнопка вызывает buy_package с типом coins_10k -->
                    <button class="buy-ton-btn" data-type="coins_10k" data-amount="1" 
                        style="background: #0098ea; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer;">
                        1 TON
                    </button>
                </div>

                <!-- ОБМЕН: 5 ЭНЕРГИИ ЗА 1 КРИСТАЛЛ -->
                <div class="powerup-card" style="background: #fff8e1 !important; border-color: #f7d51d !important;">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">⚡</div>
                        <div>
                            <div class="name">5 ЭНЕРГИИ</div>
                            <div class="desc">Зарядись!</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 10px; color: #666; margin-bottom: 2px;"></div>
                        <!-- Кнопка вызывает exchange_crystals -->
                        <button class="exchange-btn" 
                            style="background: #9b59b6; color: #fff; border: none; border-radius: 15px; padding: 6px 15px; font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 0 #8e44ad;">
                            1 💎
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- ВКЛАДКА 2: СПОСОБНОСТИ (За игровые монеты) -->
        <div id="tab-powers" class="shop-tab-content">
            <div class="shop-list">
                <!-- Генерируем карточки из массива powerups -->
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
        <div style="height: 40px;"></div> <!-- Отступ снизу -->
    `;

    // --- 2. ЛОГИКА ---

    // А) Переключение вкладок
    const tabs = container.querySelectorAll('.shop-tab-btn');
    const contents = container.querySelectorAll('.shop-tab-content');
    tabs.forEach(tab => {
        tab.onclick = () => {
            // Убираем активный класс со всех кнопок и контента
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-view'));
            
            // Добавляем активный класс нажатой кнопке и нужному блоку
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active-view');
        };
    });

    // Б) Подключение кнопки кошелька (если библиотека загружена)
    if (window.wallet?.tonConnectUI) {
        try { 
            window.wallet.tonConnectUI.setConnectButtonRoot('shop-ton-wallet'); 
        } catch (e) { console.warn("Ошибка кнопки кошелька:", e); }
    }

    // В) Обработка покупок за TON (Кристаллы и Монеты)
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { amount, type } = button.dataset;
            
            // Проверка подключения
            if (!window.wallet?.isConnected) {
                tg?.showAlert("Подключи кошелек!");
                return;
            }
            try {
                button.disabled = true;
                button.innerText = "⏳";
                
                // 1. Отправляем транзакцию в блокчейн
                const tx = await window.wallet.sendTransaction(amount);
                
                // 2. Если транзакция успешна — сообщаем серверу
                if (tx && tx.success) {
                    const res = await api.apiRequest('coins', 'POST', { 
                        action: 'buy_package', 
                        packageType: type 
                    });
                    
                    if (res && !res.error) {
                        // Обновляем локальный стейт
                        state.coins = res.newCoins ?? state.coins;
                        state.crystals = res.newCrystals ?? state.crystals;
                        
                        // Обновляем UI
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

    // Г) Обработка ОБМЕНА (Кристаллы -> Энергия)
    container.querySelectorAll('.exchange-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            
            // Проверка баланса кристаллов (нужен минимум 1)
            if (state.crystals < 1) {
                tg?.HapticFeedback.notificationOccurred('error');
                tg?.showAlert("Мало кристаллов! Купи за TON.");
                return;
            }

            try {
                button.disabled = true;
                button.innerText = "⏳";
                
                // Зовем API
                const res = await api.apiRequest('coins', 'POST', { action: 'exchange_crystals' });
                
                if (res && !res.error) {
                    // Обновляем стейт
                    state.crystals = res.newCrystals;
                    state.lives = res.newLives; // Lives = Энергия
                    
                    window.updateGlobalUI?.();
                    tg?.HapticFeedback.notificationOccurred('success');
                    
                    button.innerText = "✅";
                    // Возвращаем кнопку в исходное состояние через 1 сек
                    setTimeout(() => { button.innerText = "1 💎"; button.disabled = false; }, 1000);
                } else {
                    throw new Error(res.error || "Ошибка");
                }
            } catch (err) {
                console.error(err);
                button.disabled = false;
                button.innerText = "1 💎";
            }
        };
    });

    // Д) Обработка покупки СПОСОБНОСТЕЙ (за Игровые Монеты)
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { id, price } = button.dataset;
            const cost = parseInt(price);

            // Проверка баланса монет
            if (state.coins < cost) {
                tg?.HapticFeedback.notificationOccurred('error');
                return;
            }

            try {
                button.disabled = true; 
                button.innerText = "⏳";
                
                // Зовем API
                const res = await api.buyItem(id);
                
                if (res && !res.error) {
                    // Отправляем глобальное событие покупки (чтобы main.js обновил инвентарь)
                    window.dispatchEvent(new CustomEvent('buy_item', { 
                        detail: { id, price: cost, type: 'powerup', powerupType: id } 
                    }));
                    
                    button.innerText = "✅";
                    // Перерисовываем магазин через 1 сек
                    setTimeout(() => initShop(), 1000);
                }
            } catch (err) { 
                button.disabled = false; 
                button.innerText = "КУПИТЬ"; 
            }
        };
    });
}