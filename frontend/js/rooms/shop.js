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
        <div class="shop-section">
            <h4 style="color: #f7d51d; margin: 5px 0 10px 0; text-shadow: 1px 1px 0 #000;">💎 ПОПОЛНИТЬ</h4>
            <div id="shop-ton-wallet" style="margin-bottom: 15px; display: flex; justify-content: center;"></div>
            
            <div class="shop-grid">
                <div class="shop-card">
                    <div style="font-size: 30px;">🟡</div> <!-- Желтый круг -->
                    <div style="font-weight: 800; font-size: 16px;">10 Монет</div>
                    <button class="buy-ton-btn primary-btn" data-amount="1" data-coins="10" style="width: 100%; margin-top: 5px;">1 TON</button>
                </div>
                <!-- ... другие карточки ... -->
            </div>
        </div>
        
        <div class="shop-section" style="margin-top: 20px;">
            <h4 style="color: #f7d51d; margin: 5px 0 10px 0; text-shadow: 1px 1px 0 #000;">⚡ СПОСОБНОСТИ</h4>
            <div class="shop-list" style="display: flex; flex-direction: column; gap: 8px;">
                ${powerups.map(p => `
                    <div class="shop-card" style="flex-direction: row; text-align: left; align-items: center;">
                        <span style="font-size: 24px; margin-right: 15px;">${p.icon}</span>
                        <div style="flex-grow: 1;">
                            <p style="margin: 0; font-weight: bold;">${p.name}</p>
                            <p style="margin: 0; font-size: 13px; color: #f7d51d;">🟡 ${p.price}</p>
                        </div>
                        <button class="buy-ingame-btn secondary-btn" data-id="${p.id}" data-price="${p.price}" style="padding: 6px 12px; font-size: 11px;">КУПИТЬ</button>
                    </div>
                `).join('')}
            </div>
        </div>
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