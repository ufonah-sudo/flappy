/**
 * js/rooms/shop.js - Модуль управления внутриигровым магазином
 */

// Импортируем методы API для связи с сервером
import * as api from '../../api.js';

/**
 * Инициализация магазина: отрисовка контента и навешивание обработчиков событий
 */
export function initShop() {
    // Получаем доступ к глобальному состоянию игры из объекта window
    const state = window.state;
    // Получаем доступ к SDK Telegram WebApp для обратной связи (вибрация, уведомления)
    const tg = window.Telegram?.WebApp;

    // Находим контейнер, куда будет вставлена верстка магазина
    const container = document.querySelector('#scene-shop #shop-content');
    // Если контейнер не найден на странице, прекращаем выполнение функции
    if (!container) return;

    // Конфигурация способностей (названия, цены, иконки и описания)
    const powerups = [
        { id: 'heart',  name: 'Сердечко', price: 50, icon: '❤️', desc: 'Вторая жизнь' },
        { id: 'shield', name: 'Щит',     price: 20, icon: '🛡️', desc: 'Защита от труб' },
        { id: 'gap',    name: 'Проемы',  price: 20, icon: '↔️', desc: 'Широкие проходы' },
        { id: 'magnet', name: 'Магнит',  price: 30, icon: '🧲', desc: 'Притяжение монет' },
        { id: 'ghost',  name: 'Призрак', price: 25, icon: '👻', desc: 'Пролет сквозь стены' }
    ];

    // Формируем HTML-структуру магазина: разделы TON и Способности
    container.innerHTML = `
        <div class="shop-section">
            <h4 style="color: #f7d51d; margin: 10px 0; font-size: 14px; text-align: left; text-transform: uppercase;">💎 Пополнить баланс</h4>
            <div id="shop-ton-wallet" style="margin-bottom: 15px; display: flex; justify-content: center; min-height: 40px;"></div>
            
            <div class="shop-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="shop-card">
                    <div style="font-size: 32px; margin-bottom: 5px;">🪙</div>
                    <div style="font-weight: 800; font-size: 16px;">10 Монет</div>
                    <div style="font-size: 10px; color: #aaa; margin-bottom: 10px;">Старт</div>
                    <button class="buy-ton-btn primary-btn" data-amount="1" data-coins="10" style="width: 100%; padding: 10px; font-size: 14px;">1 TON</button>
                </div>
                <div class="shop-card">
                    <div style="font-size: 32px; margin-bottom: 5px;">💰</div>
                    <div style="font-weight: 800; font-size: 16px;">55 Монет</div>
                    <div style="font-size: 10px; color: #4ec0ca; margin-bottom: 10px;">+10% БОНУС</div>
                    <button class="buy-ton-btn primary-btn" data-amount="5" data-coins="55" style="width: 100%; padding: 10px; font-size: 14px;">5 TON</button>
                </div>
            </div>
        </div>

        <div class="shop-section" style="margin-top: 25px;">
            <h4 style="color: #f7d51d; margin: 10px 0; font-size: 14px; text-align: left; text-transform: uppercase;">⚡ Способности</h4>
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
                        <button class="buy-ingame-btn secondary-btn" data-item="${p.id}" data-price="${p.price}" style="margin: 0; padding: 8px 12px; width: auto; font-size: 12px; font-weight: 900;">КУПИТЬ</button>
                    </div>
                `).join('')}
            </div>
        </div>
        <div style="height: 100px;"></div> `;

    // Инициализация кнопки TON Connect (если менеджер кошелька активен)
    if (window.wallet && window.wallet.tonConnectUI) {
        try {
            // Привязываем UI кнопку кошелька к созданному в верстке блоку
            window.wallet.tonConnectUI.setConnectButtonRoot('#shop-ton-wallet');
        } catch (e) {
            // В случае ошибки выводим предупреждение в консоль
            console.warn("[Shop] Ошибка TON Connect:", e);
        }
    }

    // --- 1. ЛОГИКА ПОКУПКИ МОНЕТ ЗА TON ---
    container.querySelectorAll('.buy-ton-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget; // Получаем текущую кнопку
            const { amount, coins } = button.dataset; // Извлекаем сумму TON и кол-во монет

            // Проверяем, подключен ли кошелек TON
            if (!window.wallet?.isConnected) {
                if (tg) {
                    // Вибрация-предупреждение
                    tg.HapticFeedback.notificationOccurred('warning');
                    // Предложение перейти в настройки для подключения
                    tg.showConfirm("Кошелек не подключен. Перейти в настройки?", (ok) => {
                        if (ok) window.showRoom('settings');
                    });
                }
                return;
            }
            
            try {
                button.disabled = true; // Блокируем кнопку на время транзакции
                const originalText = button.innerText; // Сохраняем исходный текст кнопки
                button.innerHTML = `⏳`; // Показываем индикатор загрузки
                
                // Вызываем функцию отправки транзакции в блокчейн TON
                const tx = await window.wallet.sendTransaction(amount);
                
                // Если транзакция прошла успешно в кошельке
                if (tx) {
                    // Уведомляем сервер о покупке для зачисления баланса в БД
                    const res = await api.buyCoins(amount);
                    if (res && !res.error) {
                        // Обновляем локальный стейт балансом из ответа сервера
                        state.coins = res.newBalance || (state.coins + parseInt(coins));
                        // Синхронизируем UI всего приложения
                        if (window.updateGlobalUI) window.updateGlobalUI();
                        if (tg) {
                            // Успешная вибрация и сообщение пользователю
                            tg.HapticFeedback.notificationOccurred('success');
                            tg.showAlert(`Успешно! Получено ${coins} монет.`);
                        }
                    }
                }
                button.innerText = originalText; // Возвращаем текст кнопки
                button.disabled = false; // Разблокируем кнопку
            } catch (err) {
                // Обработка ошибок при работе с кошельком или сетью
                console.error("Shop TON error:", err);
                button.disabled = false;
                button.innerText = `${amount} TON`;
                if (tg) tg.HapticFeedback.notificationOccurred('error');
            }
        };
    });

    // --- 2. ЛОГИКА ПОКУПКИ ПРЕДМЕТОВ ЗА МОНЕТЫ (БАЛАНС) ---
    container.querySelectorAll('.buy-ingame-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const button = e.currentTarget; // Кнопка, на которую нажали
            const { item, price } = button.dataset; // Получаем ID предмета и цену
            const cost = parseInt(price); // Преобразуем цену в число

            // Проверка баланса перед отправкой запроса (локальная проверка)
            if (state.coins < cost) {
                if (tg) {
                    // Сообщаем об ошибке вибрацией и алертом
                    tg.HapticFeedback.notificationOccurred('error');
                    tg.showAlert("Недостаточно монет! Загляни в раздел TON.");
                }
                return;
            }

            try {
                button.disabled = true; // Защита от двойного клика (спама запросами)
                const originalText = button.innerText;
                button.innerText = "⏳"; // Визуальный отклик загрузки
                
                // ВАЖНО: Отправляем запрос на сервер для списания денег и добавления предмета
                const res = await api.buyItem(item); 
                
                // Проверяем ответ от сервера (обязательно !res.error)
                if (res && !res.error) {
                    // Обновляем монеты строго из ответа сервера (защита от читов)
                    state.coins = res.newBalance;
                    
                    // Инициализируем объект способностей в стейте, если его вдруг нет
                    if (!state.powerups) state.powerups = {};
                    
                    // Обновляем количество предмета (берем из ответа сервера или прибавляем 1)
                    state.powerups[item] = res.newItemCount || (state.powerups[item] || 0) + 1;
                    
                    // Глобальное обновление UI (хедер и бейджи)
                    if (window.updateGlobalUI) window.updateGlobalUI();
                    
                    // Средняя тактильная отдача для успеха
                    if (tg) tg.HapticFeedback.impactOccurred('medium');
                    
                    button.innerText = "✅"; // Показываем успех на кнопке
                    button.style.color = "#4ec0ca";
                    
                    // Через полторы секунды перерисовываем магазин для сброса состояния кнопок
                    setTimeout(() => {
                        initShop(); 
                    }, 1500);
                } else {
                    // Если сервер отказал в покупке (например, недостаточно монет в БД)
                    throw new Error(res.message || "API error");
                }
            } catch (err) {
                // Если запрос упал или сервер вернул ошибку
                button.disabled = false;
                button.innerText = "КУПИТЬ";
                if (tg) tg.HapticFeedback.notificationOccurred('error');
                console.error("Buy item error:", err);
                if (tg) tg.showAlert("Ошибка покупки: " + err.message);
            }
        };
    });
}