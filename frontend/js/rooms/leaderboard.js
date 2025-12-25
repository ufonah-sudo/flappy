import * as api from '../api.js';

export async function initLeaderboard() {
    const listContainer = document.getElementById('leaderboard-list');
    if (!listContainer) return;

    // Показываем лоадер перед загрузкой
    listContainer.innerHTML = '<p class="loading-text">Загрузка чемпионов...</p>';

    try {
        const topPlayers = await api.getLeaderboard();

        if (!topPlayers || topPlayers.length === 0) {
            listContainer.innerHTML = '<p class="empty-text">Список пуст. Стань первым!</p>';
            return;
        }

        listContainer.innerHTML = topPlayers.map((player, index) => {
            const rank = index + 1;
            let medal = '';
            
            // Добавляем иконки для топ-3
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';
            else medal = `<span class="rank-number">${rank}</span>`;

            return `
                <div class="leader-item ${rank <= 3 ? 'top-rank' : ''}">
                    <div class="rank-col">${medal}</div>
                    <div class="name-col">${player.username || 'Аноним'}</div>
                    <div class="score-col">${player.score.toLocaleString()}</div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Leaderboard error:", e);
        listContainer.innerHTML = '<p class="error-text">Не удалось загрузить топ</p>';
    }
}