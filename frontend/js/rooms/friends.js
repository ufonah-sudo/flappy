import * as api from '../../api.js';

// Твой бот
const BOT_USERNAME = 'FlappyTonBird_bot'; 

export async function initFriends() {
    const state = window.state; 
    const tg = window.Telegram?.WebApp;
    
    const container = document.querySelector('#scene-friends .friends-list');
    const inviteBtn = document.getElementById('btn-invite-real');
    
    if (!container || !inviteBtn) {
        console.warn("[Friends] Элементы интерфейса не найдены");
        return;
    }

    // 1. Формируем реферальную ссылку
    // Используем формат /game для открытия Mini App
    const userId = tg?.initDataUnsafe?.user?.id || state?.user?.id || '0';
    const inviteLink = `https://t.me/${BOT_USERNAME}/game?startapp=${userId}`;

    // 2. Логика кнопки "Пригласить"
    inviteBtn.onclick = () => {
        const text = "Лети со мной в Flappy TON и получай монеты! 🐦💰";
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
        
        if (tg) {
            tg.openTelegramLink(shareLink);
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        } else {
            window.open(shareLink, '_blank');
        }
    };

    // 3. Отрисовка списка
    container.innerHTML = '<div class="loading-text">Загрузка друзей...</div>';

    try {
        // Здесь будет реальный вызов: const friends = await api.getFriends();
        // Пока используем тестовые данные для проверки верстки
        const friends = [
            { username: 'Ivan_Crypto', status: 'claimed' },
            { username: 'Ton_Master', status: 'pending' }
        ];

        if (friends.length === 0) {
            container.innerHTML = `
                <div class="empty-text">
                    <p>У тебя пока нет друзей.</p>
                    <p>Пригласи кого-нибудь и получай бонусы!</p>
                </div>
            `;
        } else {
            container.innerHTML = friends.map(friend => `
                <div class="friend-card">
                    <div class="item-icon-wrapper">👤</div>
                    <div class="name-col">
                        <div style="font-weight: bold;">${friend.username}</div>
                        <div style="font-size: 10px; color: ${friend.status === 'claimed' ? '#2ecc71' : '#f1c40f'}">
                            ${friend.status === 'claimed' ? 'Бонус получен' : 'В процессе'}
                        </div>
                    </div>
                    <div class="score-col">
                        ${friend.status === 'pending' ? '<button class="primary-btn claim-mini-btn" style="padding: 5px 10px; font-size: 10px; margin:0;">+5 🪙</button>' : '✅'}
                    </div>
                </div>
            `).join('');

            // Кнопки забора бонуса
            container.querySelectorAll('.claim-mini-btn').forEach(btn => {
                btn.onclick = () => {
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('success');
                        tg.showAlert("Монеты зачислены!");
                    }
                    btn.parentElement.innerHTML = '✅';
                };
            });
        }
    } catch (e) {
        console.error("[Friends] Error:", e);
        container.innerHTML = '<p class="empty-text">Ошибка загрузки списка.</p>';
    }
}