import { state, updateGlobalUI } from '../../main.js';
import * as api from '../api.js';

export function initDaily() {
    const container = document.querySelector('#scene-daily .daily-grid');
    if (!container) return;

    // Имитация данных (в будущем это будет приходить из API)
    const dailyRewards = [
        { day: 1, reward: 5, icon: '🪙' },
        { day: 2, reward: 10, icon: '🪙' },
        { day: 3, reward: 15, icon: '🪙' },
        { day: 4, reward: 20, icon: '🪙' },
        { day: 5, reward: 25, icon: '🪙' },
        { day: 6, reward: 50, icon: '🪙' },
        { day: 7, reward: 100, icon: '💎' },
    ];

    // Предположим, текущий день пользователя — 1 (это должно храниться в БД)
    const userCurrentDay = state.user?.daily_step || 1;
    const lastClaim = state.user?.last_daily_claim; // Дата последнего забора

    container.innerHTML = dailyRewards.map(item => {
        const isClaimed = item.day < userCurrentDay;
        const isCurrent = item.day === userCurrentDay;
        
        return `
            <div class="daily-card ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="daily-day">День ${item.day}</div>
                <div class="daily-icon">${item.icon}</div>
                <div class="daily-reward">+${item.reward}</div>
                ${isCurrent ? '<button id="btn-claim-daily">Забрать</button>' : ''}
            </div>
        `;
    }).join('');

    // Вешаем событие на кнопку "Забрать"
    const claimBtn = document.getElementById('btn-claim-daily');
    if (claimBtn) {
        claimBtn.onclick = async () => {
            try {
                // Здесь будет вызов api.claimDaily()
                console.log("Награда получена!");
                
                // Временно обновляем баланс локально для теста
                state.coins += dailyRewards[userCurrentDay - 1].reward;
                updateGlobalUI();
                
                claimBtn.disabled = true;
                claimBtn.innerText = "Получено";
                alert("Поздравляем! Вы получили награду за день " + userCurrentDay);
            } catch (e) {
                console.error("Daily claim error:", e);
            }
        };
    }
}