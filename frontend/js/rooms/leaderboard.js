import * as api from '../../api.js';

export async function initLeaderboard() {
    // В index.html у нас id="leaderboard-list"
    const listContainer = document.getElementById('leaderboard-list');
    
    if (!listContainer) {
        console.warn("[Leaderboard] Контейнер списка не найден");
        return;
    }

    // Состояние загрузки
    listContainer.innerHTML = `
        <div class="loading-container" style="text-align:center; padding: 40px 20px; color: #888;">
            <div class="spinner" style="font-size: 30px; margin-bottom: 10px; animation: rotate 2s linear infinite;">⏳</div>
            <p>Загрузка чемпионов...</p>
        </div>
    `;

    try {
        // Запрос к бэкенду
        const topPlayers = await api.getLeaderboard();

        if (!topPlayers || topPlayers.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; opacity: 0.6;">
                    <p>Таблица лидеров пуста. Стань первым!</p>
                </div>
            `;
            return;
        }

        const currentUserId = window.state?.user?.id;

        listContainer.innerHTML = topPlayers.map((player, index) => {
            const rank = index + 1;
            const isMe = currentUserId && player.user_id === currentUserId;
            
            let rankDisplay = '';
            if (rank === 1) rankDisplay = '🥇';
            else if (rank === 2) rankDisplay = '🥈';
            else if (rank === 3) rankDisplay = '🥉';
            else rankDisplay = `<span style="font-size: 14px; color: #888;">${rank}</span>`;

            return `
                <div class="leader-item ${rank <= 3 ? 'top-rank' : ''} ${isMe ? 'is-me' : ''}" 
                     style="${isMe ? 'border: 1px solid #f7d51d; background: rgba(247, 213, 29, 0.1);' : ''}">
                    <div class="rank-col" style="min-width: 35px; font-size: 18px;">${rankDisplay}</div>
                    
                    <div class="avatar-col" style="margin-right: 10px;">
                        <div class="mini-avatar" style="width: 32px; height: 32px; background: #34495e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: #fff; border: 1px solid rgba(255,255,255,0.1);">
                            ${(player.username || 'A')[0].toUpperCase()}
                        </div>
                    </div>

                    <div class="name-col" style="flex-grow: 1; text-align: left;">
                        <span class="player-name" style="font-weight: 600; font-size: 14px; color: ${isMe ? '#f7d51d' : '#fff'};">
                            ${player.username || 'Аноним'}
                        </span>
                        ${isMe ? '<span style="font-size: 10px; background: #f7d51d; color: #000; padding: 1px 4px; border-radius: 4px; margin-left: 5px; font-weight: 900;">ВЫ</span>' : ''}
                    </div>

                    <div class="score-col" style="font-weight: 800; color: #f7d51d; font-size: 15px;">
                        ${(player.score || 0).toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Leaderboard error:", e);
        listContainer.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <p style="color: #e74c3c;">Ошибка загрузки</p>
                <button id="retry-leaderboard" class="secondary-btn" style="margin-top: 10px; padding: 8px 20px;">Обновить</button>
            </div>
        `;
        
        const retryBtn = document.getElementById('retry-leaderboard');
        if (retryBtn) retryBtn.onclick = () => initLeaderboard();
    }
}