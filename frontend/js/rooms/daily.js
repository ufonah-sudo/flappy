import * as api from '../../api.js'; 

export function initDaily() {
    const state = window.state;
    const updateGlobalUI = window.updateGlobalUI;

    // Ищем контейнер именно в нужной сцене
    const container = document.querySelector('#scene-daily #daily-content');
    if (!container) {
        console.warn("[Daily] Container #daily-content not found");
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

    // Если данных нет, по умолчанию 1 день
    const userCurrentDay = state?.user?.daily_step || 1;
    // Проверка, забирал ли сегодня (нужен флаг daily_claimed из БД)
    const alreadyClaimedToday = state?.user?.daily_claimed || false; 

    container.innerHTML = dailyRewards.map(item => {
        const isClaimed = item.day < userCurrentDay;
        const isCurrent = item.day === userCurrentDay;
        
        return `
            <div class="daily-card ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="daily-day">День ${item.day}</div>
                <div class="daily-icon">${item.icon}</div>
                <div class="daily-reward">+${item.reward}</div>
                ${isCurrent && !alreadyClaimedToday ? 
                    `<button id="btn-claim-daily" class="primary-btn" style="padding: 5px; font-size: 10px; margin-top: 5px;">GET</button>` 
                    : isClaimed || (isCurrent && alreadyClaimedToday) ? '<div class="check-mark">✅</div>' : ''}
            </div>
        `;
    }).join('');

    const claimBtn = document.getElementById('btn-claim-daily');
    if (claimBtn) {
        claimBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                claimBtn.disabled = true;
                claimBtn.innerText = "⏳";

                // Эмуляция запроса к API
                console.log("[Daily] Claiming reward for day:", userCurrentDay);
                
                const rewardObj = dailyRewards[userCurrentDay - 1];
                if (!rewardObj) return;

                // В будущем здесь: const res = await api.claimDaily();
                
                if (state) {
                    state.coins += rewardObj.reward;
                    // Помечаем в локальном стейте, что забрали
                    if (state.user) state.user.daily_claimed = true; 
                    if (typeof updateGlobalUI === 'function') updateGlobalUI();
                }
                
                // Перерисовываем комнату, чтобы кнопка исчезла и появилась галочка
                initDaily();

                if (window.Telegram?.WebApp) {
                    const tg = window.Telegram.WebApp;
                    tg.HapticFeedback.notificationOccurred('success');
                    tg.showAlert(`Success! +${rewardObj.reward} coins!`);
                }
            } catch (e) {
                console.error("Daily claim error:", e);
                claimBtn.disabled = false;
                claimBtn.innerText = "GET";
            }
        };
    }
}