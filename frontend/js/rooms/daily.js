/**
 * js/rooms/daily.js - ПОЛНАЯ ЛОГИКА ЕЖЕДНЕВНОГО ХАБА
 */
import * as api from '../../api.js';

let countdownInterval = null;

export async function initDaily() {
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    // Ищем контейнер внутри #scene-daily. Используем селектор из rooms.css
    const container = document.querySelector('#scene-daily .room-content');

    if (!container) return;

    // Заглушка загрузки
    container.innerHTML = `<div style="text-align:center; color:#aaa; padding: 40px;">Загрузка данных...</div>`;

    try {
        // --- 1. ЗАПРОС ДАННЫХ ---
        const dailyData = await api.apiRequest('daily', 'POST');

        if (dailyData?.error) throw new Error(dailyData.error);

        // Если сервер вернул обновленного юзера (сброс дня), обновляем стейт
        if (dailyData?.refreshedUser) {
            const user = dailyData.refreshedUser;
            state.user.daily_step = user.daily_step;
            state.user.daily_claimed = user.daily_claimed;
            state.user.daily_challenges = user.daily_challenges;
            state.user.last_daily_reset = user.last_daily_reset;
            state.user.bonus_claimed = user.bonus_claimed;
        }

        // --- 2. РЕНДЕР КАРКАСА (HTML) ---
        container.innerHTML = `
            <div class="daily-section">
                <h3>Daily Rewards</h3>
                <div class="daily-streak-grid"></div>
            </div>

            <div class="daily-section">
                <h3>Daily Challenges</h3>
                <div class="challenge-list"></div>
            </div>

            <div class="daily-section" style="text-align:center;">
                <h3>Weekly Bonus</h3>
                <div class="bonus-chest-container">
                    <div class="total-progress-bar"><div class="total-progress-fill"></div></div>
                    <div class="bonus-chest"></div>
                </div>
            </div>

            <div class="daily-timer" style="margin-top:20px; color:#f7d51d; font-weight:bold; text-align:center;"></div>
        `;

        // --- 3. НАПОЛНЕНИЕ ДАННЫМИ ---

        // А) Конфигурация наград (должна совпадать с сервером)
        const dailyRewards = [
            { day: 1, reward: '50 🟡' },
            { day: 2, reward: '1 ⚡' },
            { day: 3, reward: '1 🛡️' },
            { day: 4, reward: '150 🟡' },
            { day: 5, reward: '1 💎' } 
        ];

        const streakGrid = container.querySelector('.daily-streak-grid');
        const userStep = state.user?.daily_step || 1;
        const alreadyClaimed = state.user?.daily_claimed || false;

        // Генерация карточек дней
        streakGrid.innerHTML = dailyRewards.map(item => {
            // Логика состояний:
            // 1. Пройдено: день меньше текущего ИЛИ (день равен текущему и уже забрано)
            const isClaimed = item.day < userStep || (item.day === userStep && alreadyClaimed);
            // 2. Текущий активный: день равен текущему и ЕЩЕ НЕ забрано
            const isCurrent = item.day === userStep && !alreadyClaimed;
            
            let classes = 'daily-card'; // Класс из rooms.css
            if (isClaimed) classes += ' collected'; // Добавляем стили для собранного
            if (isCurrent) classes += ' current active'; // Добавляем стили для активного (подсветка)
            
            // Блокировка 5-го дня, если мы еще не дошли
            if (item.day === 5 && userStep < 5) classes += ' locked';

            return `
                <div class="${classes}" data-day="${item.day}">
                    <span>Day ${item.day}</span>
                    <div style="font-size:24px;">${isClaimed ? '✅' : (item.day === 5 ? '💎' : '🎁')}</div>
                    <div class="val">${item.reward}</div>
                </div>
            `;
        }).join('');

        // Б) Генерация заданий
        const challengeList = container.querySelector('.challenge-list');
        const challenges = state.user?.daily_challenges || [];

        if (challenges.length > 0) {
            challengeList.innerHTML = challenges.map(ch => {
                const progress = Math.min(100, ((ch.progress || 0) / ch.target) * 100);
                // Форматируем награду (заменяем коды на иконки)
                const prettyReward = ch.reward
                    .replace('coins_', '🟡 ')
                    .replace('energy_', '⚡ ')
                    .replace('powerup_', '1 ');

                return `
                    <div class="challenge-item">
                        <div class="item-info">
                            <div class="item-name">${ch.text}</div>
                            <div class="item-val" style="font-size:12px; opacity:0.8;">${prettyReward}</div>
                        </div>
                        <div style="width: 100%; margin-top: 5px; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px;">
                            <div style="width: ${progress}%; height: 100%; background: #f7d51d; border-radius: 3px; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            challengeList.innerHTML = `<div style="text-align:center; opacity:0.5; padding:10px;">Задания выполнены!</div>`;
        }

        // В) Логика Сундука
        const completedCount = challenges.filter(c => (c.progress || 0) >= c.target).length;
        const totalBar = container.querySelector('.total-progress-fill');
        const chest = container.querySelector('.bonus-chest');
        
        // Полоска прогресса сундука
        if (totalBar) totalBar.style.width = `${(completedCount / (challenges.length || 1)) * 100}%`;

        // Состояния сундука
        if (state.user?.bonus_claimed) {
            chest.innerHTML = '<div style="font-size:40px;">✅</div>'; // Уже забрано
        } else if (completedCount === challenges.length && challenges.length > 0) {
            chest.innerHTML = '<div style="font-size:40px; cursor:pointer;" class="pulse">🎁</div>'; // Готов к сбору
            chest.classList.add('ready');
        } else {
            chest.innerHTML = '<div style="font-size:40px; opacity:0.5;">🔒</div>'; // Заблокирован
        }

        // Г) Таймер обратного отсчета
        const timerEl = container.querySelector('.daily-timer');
        if (countdownInterval) clearInterval(countdownInterval);
        
        const lastReset = new Date(state.user?.last_daily_reset || Date.now());
        const nextReset = new Date(lastReset.getTime() + (24 * 60 * 60 * 1000)); // +24 часа

        countdownInterval = setInterval(() => {
            const diff = nextReset - new Date();
            if (diff <= 0) {
                timerEl.innerText = "Обновите страницу!";
                clearInterval(countdownInterval);
            } else {
                const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                timerEl.innerText = `До обновления: ${h}:${m}`;
            }
        }, 1000);

        // --- 4. ОБРАБОТЧИКИ КЛИКОВ (ВОССТАНОВЛЕННАЯ ЛОГИКА) ---

        // 4.1 КЛИК ПО НАГРАДЕ ЗА ВХОД (STREAK)
        const currentCard = streakGrid.querySelector('.daily-card.current');
        if (currentCard) {
            currentCard.onclick = async () => {
                if (currentCard.classList.contains('locked')) {
                    tg?.showAlert("Сначала собери награды за прошлые дни!");
                    return;
                }

                try {
                    // 1. Отправляем запрос на сервер
                    const res = await api.apiRequest('daily', 'POST', { action: 'claim_streak' });

                    if (res.success) {
                        // 2. Парсим строку награды для локального обновления (чтобы цифры обновились сразу)
                        // Например: reward: "50 🟡"
                        const rewardConfig = dailyRewards[userStep - 1];
                        if (rewardConfig) {
                            const [valStr, type] = rewardConfig.reward.split(' ');
                            const amount = parseInt(valStr);

                            if (type === '🟡') state.coins = (state.coins || 0) + amount;
                            else if (type === '⚡') state.lives = (state.lives || 0) + amount;
                            else if (type === '💎') state.crystals = (state.crystals || 0) + amount;
                            else if (type === '🛡️') state.powerups.shield = (state.powerups.shield || 0) + amount;
                        }

                        // 3. Обновляем флаг
                        state.user.daily_claimed = true;
                        
                        // 4. Эффекты успеха
                        tg?.HapticFeedback.notificationOccurred('success');
                        
                        // 5. Обновляем верхний бар (монеты/кристаллы)
                        if (window.updateGlobalUI) window.updateGlobalUI();
                        
                        // 6. Полная перерисовка экрана Daily (чтобы появилась галочка)
                        initDaily();
                    } else {
                        tg?.showAlert(res.error || "Ошибка получения награды");
                    }
                } catch (e) { 
                    console.error(e);
                    tg?.showAlert("Ошибка соединения");
                }
            };
        }

        // 4.2 КЛИК ПО СУНДУКУ (CHEST)
        if (chest.classList.contains('ready')) {
            chest.onclick = async () => {
                try {
                    const res = await api.apiRequest('daily', 'POST', { action: 'claim_bonus_chest' });
                    
                    if (res.success) {
                        // Красивое сообщение о награде
                        const rewardText = (res.reward || "Награда")
                            .replace('coins', '🟡')
                            .replace('crystals', '💎')
                            .replace('energy', '⚡');

                        tg?.showAlert(`СУПЕР ПРИЗ ОТКРЫТ! \n\n${rewardText}`);
                        
                        // 1. Обновляем локальный флаг
                        state.user.bonus_claimed = true;
                        
                        // 2. Ручное обновление DOM (чтобы не перезагружать список заданий)
                        chest.classList.remove('ready'); // Убираем анимацию
                        chest.innerHTML = '<div style="font-size:40px;">✅</div>'; // Ставим галочку
                        chest.onclick = null; // Убираем клик
                        
                        // 3. Обновляем хедер
                        if (window.updateGlobalUI) window.updateGlobalUI();
                    }
                } catch (e) { 
                    console.error(e); 
                }
            };
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Ошибка: ${e.message}</div>`;
    }
}