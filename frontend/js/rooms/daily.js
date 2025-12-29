import * as api from '../../api.js';

export function initDaily() {
    const state = window.state;
    const updateGlobalUI = window.updateGlobalUI;
    const tg = window.Telegram?.WebApp;

    const streakContainer = document.querySelector('#daily-streak-content');
    const challengesContainer = document.querySelector('#daily-challenges-content');
    const bonusContainer = document.querySelector('#daily-bonus-content');

    if (!streakContainer) return;

    /* --- 1. ЛОГИКА СЕРИИ (5 ДНЕЙ) --- */
    const dailyRewards = [
        { day: 1, reward: 50, icon: '🪙', type: 'coins' },
        { day: 2, reward: 1, icon: '🧲', type: 'magnet' },
        { day: 3, reward: 75, icon: '🪙', type: 'coins' },
        { day: 4, reward: 1, icon: '👻', type: 'ghost' },
        { day: 5, reward: 200, icon: '🪙', type: 'coins' },
    ];

    // ГИГИЕНА ДАННЫХ: Если после 5 дня — сбрасываем в 1
    if (state.user.daily_step > 5) state.user.daily_step = 1;

    const userStep = state?.user?.daily_step || 1;
    const alreadyClaimed = state?.user?.daily_claimed || false;

    streakContainer.innerHTML = dailyRewards.map(item => {
        const isClaimed = item.day < userStep;
        const isCurrent = item.day === userStep;
        return `
            <div class="daily-card ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="daily-day">Day ${item.day}</div>
                <div class="daily-icon">${item.icon}</div>
                <div class="daily-reward">+${item.reward}</div>
                ${isCurrent && !alreadyClaimed ? `<button id="btn-claim-streak" class="primary-btn-mini">GET</button>` : ''}
                ${isClaimed || (isCurrent && alreadyClaimed) ? '<div class="check-mark">✅</div>' : ''}
            </div>
        `;
    }).join('');

    const streakBtn = document.getElementById('btn-claim-streak');
    if (streakBtn) {
        streakBtn.onclick = async () => {
            const reward = dailyRewards[userStep - 1];
            
            // Начисление
            if (reward.type === 'coins') state.coins += reward.reward;
            else state.powerups[reward.type] += reward.reward;

            // ЛОГИКА ШАГА: Если забрал 5-й день, следующим будет 1-й. Иначе +1.
            state.user.daily_claimed = true;
            // Важно: Мы не увеличиваем daily_step СРАЗУ. 
            // Step увеличится завтра сервером или при проверке нового дня.
            
            tg?.HapticFeedback.notificationOccurred('success');
            updateGlobalUI();
            initDaily(); // Перерисовать, чтобы показать галочку
            
            // Отправка на сервер
            api.claimDailyReward(userStep); 
        };
    }

    /* --- 2. ЛОГИКА ЗАДАНИЙ (Без изменений, всё ок) --- */
    const challenges = state.user?.daily_challenges || [];
    if (challengesContainer) {
        challengesContainer.innerHTML = challenges.length > 0 ? challenges.map(ch => `
            <div class="challenge-item ${ch.done ? 'completed' : ''}">
                <div class="ch-info">
                    <span class="ch-text">${ch.text}</span>
                    <span class="ch-reward">🪙 ${ch.reward}</span>
                </div>
                <div class="ch-progress-bar">
                    <div class="ch-fill" style="width: ${Math.min(100, (ch.progress / ch.target) * 100)}%"></div>
                </div>
                <div class="ch-status">${ch.progress}/${ch.target}</div>
            </div>
        `).join('') : '<p>No tasks for today</p>';
    }

    /* --- 3. DAILY BONUS --- */
    if (bonusContainer) {
        const bonusClaimed = state.user?.bonus_claimed || false;
        bonusContainer.innerHTML = `
            <button id="btn-daily-bonus" class="primary-btn" ${bonusClaimed ? 'disabled' : ''}>
                ${bonusClaimed ? 'ALREADY CLAIMED' : '🎁 GET BONUS'}
            </button>
        `;

        const bonusBtn = document.getElementById('btn-daily-bonus');
        if (bonusBtn && !bonusClaimed) {
            bonusBtn.onclick = async () => {
                const roll = Math.random();
                let msg = "";
                if (roll > 0.7) {
                    state.powerups.shield += 1;
                    msg = "You got a Shield! 🛡";
                } else {
                    state.coins += 30;
                    msg = "You got 30 coins! 🪙";
                }
                
                state.user.bonus_claimed = true;
                tg?.HapticFeedback.impactOccurred('medium');
                tg?.showAlert(msg);
                
                updateGlobalUI();
                initDaily();
                
                api.claimDailyBonus();
            };
        }
    }
}