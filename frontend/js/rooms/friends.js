// Убрали импорт state из main.js, чтобы избежать ошибок загрузки
const BOT_USERNAME = 'FlappyTonBird_bot'; // Убедись, что юзернейм без @

export async function initFriends() {
    const state = window.state; // Берем из глобального окна
    const tg = window.Telegram?.WebApp;
    
    const container = document.querySelector('#scene-friends .friends-list');
    const inviteBtn = document.getElementById('btn-invite-real');
    
    if (!container || !inviteBtn) {
        console.warn("[Friends] UI Elements not found");
        return;
    }

    // 1. Формируем реферальную ссылку
    // В Telegram WebApp ID пользователя берется из initDataUnsafe
    const userId = tg?.initDataUnsafe?.user?.id || state?.user?.id || '0';
    const inviteLink = `https://t.me/${BOT_USERNAME}/app?startapp=${userId}`;

    // 2. Логика кнопки "Пригласить"
    inviteBtn.onclick = () => {
        const text = "Лети со мной в Flappy TON и получай монеты! 🐦💰";
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
        
        if (tg) {
            tg.openTelegramLink(shareLink);
            tg.HapticFeedback.impactOccurred('medium');
        } else {
            window.open(shareLink, '_blank');
        }
    };

    // 3. Загрузка списка друзей
    container.innerHTML = '<div class="loading-spinner">Загрузка друзей...</div>';

    try {
        // Имитация задержки сети
        await new Promise(resolve => setTimeout(resolve, 500));

        // В будущем здесь будет: const friends = await api.getFriends();
        const friends = [
            { username: 'Ivan_Crypto', status: 'claimed' },
            { username: 'Ton_Master', status: 'pending' }
        ];

        if (friends.length === 0) {
            container.innerHTML = `
                <div class="empty-friends">
                    <p>У тебя пока нет друзей.</p>
                    <p>Пригласи кого-нибудь, чтобы получать бонусы!</p>
                </div>
            `;
        } else {
            container.innerHTML = friends.map(friend => `
                <div class="friend-card">
                    <div class="friend-info">
                        <span class="friend-name">👤 ${friend.username}</span>
                        <span class="friend-status ${friend.status}">
                            ${friend.status === 'claimed' ? '✅ Бонус получен' : '⏳ В процессе'}
                        </span>
                    </div>
                    ${friend.status === 'pending' ? '<button class="claim-bonus-btn">Забрать +5</button>' : ''}
                </div>
            `).join('');

            // Вешаем обработчики на кнопки "Забрать +5"
            container.querySelectorAll('.claim-bonus-btn').forEach(btn => {
                btn.onclick = () => {
                    if (tg) tg.HapticFeedback.notificationOccurred('success');
                    btn.innerText = "✅";
                    btn.disabled = true;
                    // Здесь будет логика начисления монет через API
                };
            });
        }
    } catch (e) {
        console.error("[Friends] Error:", e);
        container.innerHTML = '<p class="error-text">Не удалось загрузить список друзей.</p>';
    }
}