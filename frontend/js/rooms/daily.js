/**
 * js/rooms/daily.js - НОВЫЙ DAILY HUB
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
    container.innerHTML = `<div style="text-align:center; color:#aaa;">Загрузка...</div>`;

    // Запрашиваем у сервера свежие данные (он сам проверит, не пора ли обновить день)
    const dailyData = await api.apiRequest('daily', 'POST');

    // Если сервер обновил данные, обновляем и локальный стейт
    if (dailyData && dailyData.refreshedUser) {
        state.user.daily_step = dailyData.refreshedUser.daily_step;
        state.user.daily_claimed = dailyData.refreshedUser.daily_claimed;
        state.user.daily_challenges = dailyData.refreshedUser.daily_challenges;
        state.user.last_daily_reset = dailyData.refreshedUser.last_daily_reset;
        state.user.bonus_claimed = dailyData.refreshedUser.bonus_claimed;
    }

    // --- 2. РЕНДЕР HTML-СТРУКТУРЫ ---
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

        <!-- Секция 3: Главный бонус (Сундук) -->
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

    // А) Награды за вход
    const streakGrid = container.querySelector('.daily-streak-grid');
    const dailyRewards = [
        { day: 1, reward: '50 🟡', icon: '🎁' },
        { day: 2, reward: '1 ⚡', icon: '🎁' },
        { day: 3, reward: '1 🛡️', icon: '🎁' },
        { day: 4, reward: '150 🟡', icon: '🎁' },
        { day: 5, reward: '1 💎', icon: '👑' } // Супер-приз
    ];

    const userStep = state.user?.daily_step || 1;
    const alreadyClaimedToday = state.user?.daily_claimed || false;
    const isFifthDaySpecial = userStep === 5 && !dailyRewards.slice(0, 4).some((_, i) => (i + 1) >= userStep);

    streakGrid.innerHTML = dailyRewards.map(item => {
        const isClaimed = item.day < userStep;
        const isCurrent = item.day === userStep && !alreadyClaimedToday;
        
        let cardClass = 'daily-reward-card';
        if (isClaimed) cardClass += ' claimed';
        if (isCurrent) cardClass += ' current';

        return `
            <div class="${cardClass}" data-day="${item.day}">
                <div class="day">День ${item.day}</div>
                <div class="icon">${item.icon}</div>
                <div class="reward">${item.reward}</div>
            </div>
        `;
    }).join('');

    // Б) Задания
    const challengeList = container.querySelector('.challenge-list');
    const challenges = state.user?.daily_challenges || [];
    challengeList.innerHTML = challenges.map(ch => {
        const progress = Math.min(100, (ch.progress / ch.target) * 100);
        return `
            <div class="challenge-card">
                <div class="info">
                    <span class="text">${ch.text}</span>
                    <span class="reward">${ch.reward.replace('_', ' ')}</span>
                </div>
                <div class="challenge-progress">
                    <div class="challenge-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // В) Сундук и прогресс-бар
    const completedCount = challenges.filter(c => c.progress >= c.target).length;
    const totalProgressFill = container.querySelector('.total-progress-fill');
    totalProgressFill.style.width = `${(completedCount / 3) * 100}%`;

    const chest = container.querySelector('.bonus-chest');
    if (state.user?.bonus_claimed) {
        chest.innerHTML = '✅';
        chest.classList.remove('ready');
    } else if (completedCount === 3) {
        chest.innerHTML = '🎁';
        chest.classList.add('ready'); // Анимация тряски
    } else {
        chest.innerHTML = '🔒';
        chest.classList.remove('ready');
    }
    
    // Г) Таймер
    const timerEl = container.querySelector('.daily-timer');
    // ... (логика таймера ниже)

    // --- 4. ЛОГИКА КЛИКОВ ---

    // Клик по награде за вход
    streakGrid.querySelectorAll('.daily-reward-card.current').forEach(card => {
        card.onclick = async () => {
            // ... (здесь будет логика выдачи) ...
            tg?.showAlert("Награда получена!");
        };
    });

    // Клик по сундуку
    if (chest.classList.contains('ready')) {
        chest.onclick = async () => {
            // ... (логика выдачи супер-приза) ...
            tg?.showAlert("СУПЕР ПРИЗ!");
            initDaily(); // Перерисовать
        };
    }
    
    // --- 5. ЛОГИКА ТАЙМЕРА ---
    if (countdownInterval) clearInterval(countdownInterval); // Сбрасываем старый
    
    const lastResetDate = new Date(state.user?.last_daily_reset || Date.now());
    const nextResetDate = new Date(lastResetDate.getTime() + (24 * 60 * 60 * 1000));
    
    countdownInterval = setInterval(() => {
        const remaining = nextResetDate - new Date();
        if (remaining <= 0) {
            timerEl.innerHTML = "Можно обновлять!";
            clearInterval(countdownInterval);
            // Можно добавить кнопку "Обновить"
        } else {
            const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
            const minutes = Math.floor((remaining / 1000 / 60) % 60).toString().padStart(2, '0');
            const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
            timerEl.innerHTML = `Новые задания через: ${hours}:${minutes}:${seconds}`;
        }
    }, 1000);
}
