/**
 * js/rooms/daily.js - НОВЫЙ DAILY HUB (FINAL)
 */
import * as api from '../../api.js';

let countdownInterval = null; // Переменная для таймера

export async function initDaily() {
    // 1. ПОЛУЧАЕМ ДАННЫЕ
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    const container = document.querySelector('#scene-daily #daily-content-wrapper');

    if (!container) return;
    
    // Показываем заглушку-загрузку
    container.innerHTML = `<div style="text-align:center; color:#aaa; padding: 40px;">Загрузка ежедневных наград...</div>`;

     try {
        // --- ЗАПРОС СВЕЖИХ ДАННЫХ С СЕРВЕРА ---
        const dailyData = await api.apiRequest('daily', 'POST');

        // ЕСЛИ ЕСТЬ ОШИБКА - ПОКАЗЫВАЕМ
        if (dailyData && dailyData.error) {
            throw new Error(dailyData.error);
        }

        // Если сервер прислал обновленного юзера (т.е. день сбросился)
        if (dailyData && dailyData.refreshedUser) {
            // Обновляем локальный стейт
            const user = dailyData.refreshedUser;
            state.user.daily_step = user.daily_step;
            state.user.daily_claimed = user.daily_claimed;
            state.user.daily_challenges = user.daily_challenges;
            state.user.last_daily_reset = user.last_daily_reset;
            state.user.bonus_claimed = user.bonus_claimed;
        }

        // --- 2. РЕНДЕР HTML-СКЕЛЕТА ---
        container.innerHTML = `
            <!-- Секция 1: Награды за вход -->
            <div class="daily-hub-section">
                <h4>Награды за вход</h4>
                <div class="daily-streak-grid"></div>
            </div>

            <!-- Секция 2: Ежедневные задания -->
            <div class="daily-hub-section">
                <h4>Задания дня</h4>
                <div class="challenge-list"></div>
            </div>

            <!-- Секция 3: Главный приз (Сундук) -->
            <div class="daily-hub-section">
                <h4>Главный приз</h4>
                <div class="bonus-chest-container">
                    <div class="total-progress-bar"><div class="total-progress-fill"></div></div>
                    <div class="bonus-chest"></div>
                </div>
            </div>

            <!-- Таймер -->
            <div class="daily-timer"></div>
        `;

        // --- 3. ЗАПОЛНЕНИЕ КОНТЕНТОМ ---

        // А) Награды за вход (5 дней, шахматный порядок)
        const streakGrid = container.querySelector('.daily-streak-grid');
        const dailyRewards = [
            { day: 1, reward: '50 🟡' },
            { day: 2, reward: '1 ⚡' },
            { day: 3, reward: '1 🛡️' },
            { day: 4, reward: '150 🟡' },
            { day: 5, reward: '1 💎' } // Супер-приз
        ];

        const userStep = state.user?.daily_step || 1;
        const alreadyClaimedToday = state.user?.daily_claimed || false;
        
        streakGrid.innerHTML = dailyRewards.map(item => {
            const isClaimed = item.day < userStep;
            const isCurrent = item.day === userStep && !alreadyClaimedToday;
            const isFuture = item.day > userStep;

            let cardClass = 'daily-reward-card';
            if (isClaimed) cardClass += ' claimed';
            if (isCurrent) cardClass += ' current';
            
            // Проверка для 5-го дня (доступен только если 4 предыдущих забраны)
            if (item.day === 5 && userStep < 5) {
                cardClass += ' locked';
            }

            return `
                <div class="${cardClass}" data-day="${item.day}">
                    <div class="day">День ${item.day}</div>
                    <div class="icon">${isClaimed ? '✅' : '🎁'}</div>
                    <div class="reward">${item.reward}</div>
                </div>
            `;
        }).join('');
        
        // Б) Задания
        const challengeList = container.querySelector('.challenge-list');
        const challenges = state.user?.daily_challenges || [];
        if(challenges.length > 0) {
            challengeList.innerHTML = challenges.map(ch => {
                const progress = Math.min(100, ((ch.progress || 0) / ch.target) * 100);
                return `
                    <div class="challenge-card">
                        <div class="info">
                            <span class="text">${ch.text}</span>
                            <span class="reward">${ch.reward.replace('coins_', '🟡 ').replace('energy_', '⚡ ').replace('powerup_', '1 ')}</span>
                        </div>
                        <div class="challenge-progress">
                            <div class="challenge-progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            challengeList.innerHTML = `<p style="text-align:center;color:#888;">Нет заданий</p>`;
        }


        // В) Сундук
        const completedCount = challenges.filter(c => (c.progress || 0) >= c.target).length;
        const totalProgressFill = container.querySelector('.total-progress-fill');
        totalProgressFill.style.width = `${(completedCount / challenges.length) * 100}%`;

        const chest = container.querySelector('.bonus-chest');
        if (state.user?.bonus_claimed) {
            chest.innerHTML = '✅';
            chest.classList.remove('ready');
        } else if (completedCount === challenges.length && challenges.length > 0) {
            chest.innerHTML = '🎁';
            chest.classList.add('ready');
        } else {
            chest.innerHTML = '🔒';
            chest.classList.remove('ready');
        }
        
        // Г) Таймер
        const timerEl = container.querySelector('.daily-timer');
        if (countdownInterval) clearInterval(countdownInterval);
        
        const lastResetDate = new Date(state.user?.last_daily_reset || Date.now());
        const nextResetDate = new Date(lastResetDate.getTime() + (24 * 60 * 60 * 1000));
        
        countdownInterval = setInterval(() => {
            const remaining = nextResetDate - new Date();
            if (remaining <= 0) {
                timerEl.innerHTML = "Готово к обновлению!";
                clearInterval(countdownInterval);
            } else {
                const h = Math.floor((remaining / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
                const m = Math.floor((remaining / 1000 / 60) % 60).toString().padStart(2, '0');
                const s = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
                timerEl.innerHTML = `Новые задания через: ${h}:${m}:${s}`;
            }
        }, 1000);

        // --- 4. КЛИКИ ---
        
       // --- 4. КЛИКИ ---

    // Клик по награде за вход
    const currentCard = streakGrid.querySelector('.daily-reward-card.current');
    if (currentCard) {
        currentCard.onclick = async () => {
            // Проверяем, не заблокирован ли 5-й день
            if(currentCard.classList.contains('locked')) {
                tg?.showAlert("Сначала собери все предыдущие награды!");
                return;
            }

            try {
                // 1. Отправляем запрос на сервер, чтобы он поставил флаг 'daily_claimed'
                const res = await api.apiRequest('daily', 'POST', { action: 'claim_streak' });

                if (res.success) {
                    // 2. Выдаем награду на стороне клиента
                    const rewardConfig = dailyRewards[userStep - 1]; // Находим конфиг награды
                    const [value, type] = rewardConfig.reward.split(' ');
                    const amount = parseInt(value);

                    if (type === '🟡') {
                        state.coins += amount;
                    } else if (type === '⚡') {
                        state.lives += amount;
                    } else if (type === '💎') {
                        state.crystals += amount;
                    } else {
                        // Для способностей (🛡️)
                        const powerupId = rewardConfig.id || 'shield'; // Заглушка, нужно будет правильно прописать ID
                        state.powerups[powerupId] = (state.powerups[powerupId] || 0) + amount;
                    }

                    // 3. Обновляем UI
                    tg?.HapticFeedback.notificationOccurred('success');
                    tg?.showAlert(`Получена награда: ${rewardConfig.reward}!`);
                    updateGlobalUI(); // Обновляем баланс в хедере
                     // 👇 ЭТА СТРОКА ОТВЕЧАЕТ ЗА ГАЛОЧКУ 👇
                    // Мы должны обновить стейт, чтобы при перерисовке галочка встала
                    state.user.daily_claimed = true; 
                    

                    // 4. Перерисовываем, чтобы показать галочку
                    initDaily(); 
                } else {
                    throw new Error(res.error || "Не удалось забрать награду");
                }
            } catch (e) {
                console.error(e);
                tg?.showAlert(e.message);
            }
        };
    }

        // Клик по сундуку
        if (chest.classList.contains('ready')) {
            chest.onclick = async () => {
                try {
                    const res = await api.apiRequest('daily', 'POST', { action: 'claim_bonus_chest' });
                    if(res.success) {
                        tg?.showAlert("Супер-приз получен!");
                        // Тут надо обновить state
                        initDaily(); 
                    }
                } catch(e) { tg?.showAlert(e.message); }
            };
        }

    } catch (error) {
        container.innerHTML = `<div style="text-align:center; color:red;">Ошибка загрузки: ${error.message}</div>`;
    }
}
