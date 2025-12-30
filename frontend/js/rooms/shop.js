/**
 * js/rooms/shop.js - Модуль управления внутриигровым магазином
 */

// Импортируем методы API для связи с сервером
import * as api from '../../api.js';

/**
 * Инициализация магазина: отрисовка контента и навешивание обработчиков событий
 */
export function initShop() {
    // Получаем доступ к глобальному состоянию игры и SDK Telegram
    const state = window.state;
    const tg = window.Telegram?.WebApp;

    // Находим контейнер для верстки
    const container = document.querySelector('#scene-shop #shop-content');
    if (!container) return;

    // Конфигурация способностей
    const powerups = [
        { id: 'heart',  name: 'Сердечко', price: 50, icon: '❤️', desc: 'Вторая жизнь' },
        { id: 'shield', name: 'Щит',     price: 20, icon: '🛡️', desc: 'Защита от труб' },
        { id: 'gap',    name: 'Проемы',  price: 20, icon: '↔️', desc: 'Широкие проходы' },
        { id: 'magnet', name: 'Магнит',  price: 30, icon: '🧲', desc: 'Притяжение монет' },
        { id: 'ghost',  name: 'Призрак', price: 25, icon: '👻', desc: 'Пролет сквозь стены' }
    ];

    // Отрисовка интерфейса
    container.innerHTML = `
        <div class="shop-section" style="user-select: none;">
            <h4 style="color: #f7d51d; margin: 10px 0; font-size: 14px; text-align: left; text-transform: uppercase; font-family: 'Press Start 2P', cursive;">💎 Пополнить баланс</h4>
            <div id="shop-ton-wallet" style="margin-bottom: 15px; display: flex; justify-content: center; min-height: 40px;"></div>
            
            <div class="shop-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="shop-card" style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 32px; margin-bottom: 5px;">🪙</div>
                    <div style="font-weight: 800; font-size: 16px;">10 Монет</div>
                    <div style="font-size: 10px; color: #aaa; margin-bottom: 10px;">Старт</div>
                    <button class="buy-ton-btn primary-btn" data-amount="1" data-coins="10" style="width: 100%; padding: 10px; font-size: 14px; cursor: pointer;">1 TON</button>
                </div>
                <div class="shop-card" style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 32px; margin-bottom: 5px;">💰</div>
                    <div style="font-weight: 800; font-size: 16px;">55 Монет</div>
                    <div style="font-size: 10px; color: #4ec0ca; margin-bottom: 10px;">+10% БОНУС</div>
                    <button class="buy-ton-btn primary-btn" data-amount="5" data-coins="55" style="width: 100%; padding: 10px; font-size: 14px; cursor: pointer;">5 TON</button>
                </div>
            </div>
        </div>

        <div class="shop-section" style="margin-top: 25px; user-select: none;">
            <h4 style="color: #f7d51d; margin: 10px 0; font-size: 14px; text-align: left; text-transform: uppercase; font-family: 'Press Start 2P', cursive;">⚡ Способности</h4>
            <div class="shop-list" style="display: flex; flex-direction: column; gap: 10px;">
                ${powerups.map(p => `
                    <div class="shop-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                        <div class="item-info" style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 24px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 12px;">${p.icon}</span>
                            <div style="text-align: left;">
                                <p style="margin: 0; font-weight: bold; font-size: 15px;">${p.name}</p>
                                <p style="margin: 0; font-size: 11px; color: #aaa;">${p.desc}</p>
                                <p style="margin: 2px 0 0 0; font-size: 13px; color: #f7d51d; font-weight: 800;">🪙 ${p.price}</p>
                            </div>
                        </div>
                        <button class="buy-ingame-btn secondary-btn" 
                                data-id="${p.id}" 
                                data-price="${p.price}" 
                                style="margin: 0; padding: 8px 12px; width: auto; font-size: 12px; font-weight: 900; cursor: pointer;">
                            КУПИТЬ
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        <div style="height: 100px;"></div>
    `;

    // Подключаем кнопку TON Connect
    if (window.wallet?.tonConnectUI) {
        try {
            window.wallet.tonConnectUI.setConnectButtonRoot('#shop-ton-wallet');
        } catch (e) {
            console.warn("[Shop] Ошибка подключения кнопки TON Connect:", e);
        }
    }

    // --- 1. ЛОГИКА TON ТРАНЗАКЦИЙ ---
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
                button.innerHTML = `⏳`;
                
                const tx = await window.wallet.sendTransaction(amount);
                
                if (tx) {
                    const res = await api.buyCoins(amount);
                    if (res && !res.error) {
                        state.coins = res.newBalance || (state.coins + parseInt(coins));
                        window.updateGlobalUI?.();
                        tg?.HapticFeedback.notificationOccurred('success');
                        tg?.showAlert(`Успешно! Получено ${coins} монет.`);
                    }
                }
                button.innerText = originalText;
                button.disabled = false;
            } catch (err) {
                console.error("TON error:", err);
                button.disabled = false;
                button.innerText = `${amount} TON`;
                tg?.HapticFeedback.notificationOccurred('error');
            }
        };
    });

    // --- 2. ЛОГИКА ПОКУПКИ ЗА МОНЕТЫ ---
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget;
            const { id, price } = button.dataset;
            const cost = parseInt(price);

            // 1. Локальная проверка
            if (state.coins < cost) {
                tg?.HapticFeedback.notificationOccurred('error');
                tg?.showAlert("Недостаточно монет!");
                return;
            }

            try {
                button.disabled = true;
                button.innerText = "⏳";

                // 2. Отправляем запрос на бэкенд
                const res = await api.buyItem(id);

                if (res && !res.error) {
                    // 3. Вызываем глобальное событие покупки (которое слушает main.js)
                    // Это гарантирует, что инвентарь и монеты обновятся везде синхронно
                    const buyEvent = new CustomEvent('buy_item', {
                        detail: { 
                            id: id, 
                            price: cost, 
                            type: 'powerup', 
                            powerupType: id 
                        }
                    });
                    window.dispatchEvent(buyEvent);

                    // 4. Визуальный успех
                    button.innerText = "✅";
                    button.style.color = "#4ec0ca";
                    tg?.HapticFeedback.impactOccurred('medium');

                    // 5. Мягкое обновление через 1 сек
                    setTimeout(() => initShop(), 1200);
                } else {
                    throw new Error(res?.message || "Ошибка сервера");
                }
            } catch (err) {
                button.disabled = false;
                button.innerText = "КУПИТЬ";
                tg?.HapticFeedback.notificationOccurred('error');
                tg?.showAlert("Ошибка: " + err.message);
            }
        };
    });
}