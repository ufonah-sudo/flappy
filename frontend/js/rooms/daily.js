import * as api from '../api.js';

export function initDaily() {
    // Используем window.state, так как мы привязали его в main.js
    const state = window.state;
    const updateGlobalUI = window.updateGlobalUI;

    const container = document.querySelector('#scene-daily .daily-grid');
    if (!container) {
        console.warn("[Daily] Container .daily-grid not found");
        return;
    }

    const dailyRewards = [
        { day: 1, reward: 5, icon: '🪙' },
        { day: 2, reward: 10, icon: '🪙' },
        { day: 3, reward: 15, icon: '🪙' },
        { day: 4, reward: 20, icon: '🪙' },
        { day: 5, reward: 25, icon: '🪙' },
        { day: 6, reward: 50, icon: '🪙' },
        { day: 7, reward: 100, icon: '💎' },
    ];

    // Берем данные пользователя безопасно
    const userCurrentDay = state?.user?.daily_step || 1;
    
    // Простая логика отрисовки
    container.innerHTML = dailyRewards.map(item => {
        const isClaimed = item.day < userCurrentDay;
        const isCurrent = item.day === userCurrentDay;
        
        return `
            <div class="daily-card ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="daily-day">День ${item.day}</div>
                <div class="daily-icon">${item.icon}</div>
                <div class="daily-reward">+${item.reward}</div>
                ${isCurrent ? `<button id="btn-claim-daily" class="claim-btn">Забрать</button>` : ''}
            </div>
        `;
    }).join('');

    // Вешаем событие
    const claimBtn = document.getElementById('btn-claim-daily');
    if (claimBtn) {
        claimBtn.onclick = async () => {
            try {
                // Визуальный фидбек сразу
                claimBtn.disabled = true;
                claimBtn.innerText = "⏳...";

                // Здесь в будущем будет: await api.claimDaily();
                console.log("[Daily] Claiming reward for day:", userCurrentDay);
                
                // Обновляем состояние
                if (state) {
                    state.coins += dailyRewards[userCurrentDay - 1].reward;
                    // Обновляем интерфейс везде
                    if (typeof updateGlobalUI === 'function') updateGlobalUI();
                }
                
                claimBtn.innerText = "Получено";
                claimBtn.classList.add('btn-disabled');

                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                    window.Telegram.WebApp.showAlert(`Поздравляем! +${dailyRewards[userCurrentDay - 1].reward} монет!`);
                }
            } catch (e) {
                console.error("Daily claim error:", e);
                claimBtn.disabled = false;
                claimBtn.innerText = "Забрать";
            }
        };
    }
}