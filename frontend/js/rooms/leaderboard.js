import * as api from '../api.js';

export async function initLeaderboard() {
    // Используем более точный селектор внутри конкретной сцены
    const listContainer = document.querySelector('#scene-leaderboard .leaderboard-list') || document.getElementById('leaderboard-list');
    
    if (!listContainer) {
        console.warn("[Leaderboard] Контейнер списка не найден в DOM");
        return;
    }

    // Состояние загрузки
    listContainer.innerHTML = `
        <div class="loading-container">
            <span class="spinner">⏳</span>
            <p class="loading-text">Загрузка чемпионов...</p>
        </div>
    `;

    try {
        const topPlayers = await api.getLeaderboard();

        if (!topPlayers || topPlayers.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p class="empty-text">Список пуст. Стань первым!</p>
                </div>
            `;
            return;
        }

        // Берем текущего пользователя из глобального стейта для подсветки
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
            <div class="error-container">
                <p class="error-text">Не удалось загрузить топ</p>
                <button onclick="initLeaderboard()" class="retry-btn">Обновить</button>
            </div>
        `;
    }
}