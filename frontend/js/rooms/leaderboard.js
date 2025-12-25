// ИСПРАВЛЕНО: Поднимаемся на два уровня вверх к api.js
import * as api from '../../api.js';

export async function initLeaderboard() {
    const listContainer = document.querySelector('#scene-leaderboard .leaderboard-list') || document.getElementById('leaderboard-list');
    
    if (!listContainer) {
        console.warn("[Leaderboard] Контейнер списка не найден в DOM");
        return;
    }

    listContainer.innerHTML = `
        <div class="loading-container" style="text-align:center; padding: 20px;">
            <span class="spinner">⏳</span>
            <p class="loading-text">Загрузка чемпионов...</p>
        </div>
    `;

    try {
        const topPlayers = await api.getLeaderboard();

        if (!topPlayers || topPlayers.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="text-align:center; padding: 20px;">
                    <p class="empty-text">Список пуст. Стань первым!</p>
                </div>
            `;
            return;
        }

        const currentUserId = window.state?.user?.id;

        listContainer.innerHTML = topPlayers.map((player, index) => {
            const rank = index + 1;
            const isMe = currentUserId && player.user_id === currentUserId;
            
            let medal = '';
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';
            else medal = `<span class="rank-number">${rank}</span>`;

            return `
                <div class="leader-item ${rank <= 3 ? 'top-rank' : ''} ${isMe ? 'is-me' : ''}">
                    <div class="rank-col">${medal}</div>
                    <div class="avatar-col">
                        <div class="mini-avatar">${(player.username || 'A')[0].toUpperCase()}</div>
                    </div>
                    <div class="name-col">
                        <span class="player-name">${player.username || 'Аноним'}</span>
                        ${isMe ? '<span class="me-tag">Вы</span>' : ''}
                    </div>
                    <div class="score-col">${(player.score || 0).toLocaleString()}</div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Leaderboard loading error:", e);
        listContainer.innerHTML = `
            <div class="error-container" style="text-align:center; padding: 20px;">
                <p class="error-text">Не удалось загрузить топ</p>
                <button id="retry-leaderboard" class="secondary-btn">Обновить</button>
            </div>
        `;
        
        const retryBtn = document.getElementById('retry-leaderboard');
        if (retryBtn) retryBtn.onclick = () => initLeaderboard();
    }
}

// Делаем функцию доступной глобально на всякий случай
window.initLeaderboard = initLeaderboard;