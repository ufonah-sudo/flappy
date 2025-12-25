import { state } from '../../main.js';

const BOT_USERNAME = 'FlappyTonBird_bot'; // Замени на юзернейм своего бота

export async function initFriends() {
    const container = document.querySelector('#scene-friends .friends-list');
    const inviteBtn = document.getElementById('btn-invite-real');
    
    if (!container || !inviteBtn) return;

    // 1. Формируем реферальную ссылку
    const userId = state.user?.id || '0';
    const inviteLink = `https://t.me/${BOT_USERNAME}/app?startapp=${userId}`;

    // 2. Логика кнопки "Пригласить"
    inviteBtn.onclick = () => {
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Лети со мной в Flappy TON и получай монеты! 🐦💰`;
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(shareLink);
        } else {
            window.open(shareLink, '_blank');
        }
    };

    // 3. Загрузка списка друзей
    container.innerHTML = '<p class="loading-text">Загрузка друзей...</p>';

    try {
        // Здесь в будущем будет fetch к твоему API (например, /api/friends)
        // Пока сделаем заглушку на основе того, что мы знаем о рефералах
        
        // Имитация данных
        const friends = [
            { username: 'Ivan_Crypto', status: 'claimed' },
            { username: 'Ton_Master', status: 'pending' }
        ];

        if (friends.length === 0) {
            container.innerHTML = '<p class="empty-text">У тебя пока нет приглашенных друзей.</p>';
        } else {
            container.innerHTML = friends.map(friend => `
                <div class="friend-card">
                    <div class="friend-info">
                        <span class="friend-name">👤 ${friend.username}</span>
                        <span class="friend-status">${friend.status === 'claimed' ? '✅ Бонус получен' : '⏳ В процессе'}</span>
                    </div>
                    ${friend.status === 'pending' ? '<button class="claim-bonus-btn">Забрать +5</button>' : ''}
                </div>
            `).join('');
        }
    } catch (e) {
        container.innerHTML = '<p class="error-text">Ошибка при загрузке списка.</p>';
    }
}