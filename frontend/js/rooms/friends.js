import * as api from '../../api.js';

// Твой бот (убедись, что username совпадает)
const BOT_USERNAME = 'FlappyTonBird_bot'; 

export async function initFriends() {
    const state = window.state; 
    const tg = window.Telegram?.WebApp;
    const updateGlobalUI = window.updateGlobalUI;
    
    const container = document.querySelector('#scene-friends .friends-list');
    const inviteBtn = document.getElementById('btn-invite-real');
    
    if (!container || !inviteBtn) {
        console.warn("[Friends] Элементы интерфейса не найдены");
        return;
    }

    // 1. Формируем реферальную ссылку
    const userId = tg?.initDataUnsafe?.user?.id || state?.user?.id || '0';
    // Добавляем параметр startapp для обработки реферала на бэкенде
    const inviteLink = `https://t.me/${BOT_USERNAME}/game?startapp=${userId}`;

    // 2. Логика кнопки "Пригласить"
    inviteBtn.onclick = (e) => {
        e.preventDefault();
        const text = "Лети со мной в Flappy TON! 🐦 Помоги птичке и заработай монеты! 💰";
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
        
        if (tg) {
            tg.openTelegramLink(shareLink);
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        } else {
            window.open(shareLink, '_blank');
        }
    };

    // 3. Отрисовка списка
    container.innerHTML = '<div class="loading-text" style="color:#aaa; margin-top:20px;">Загрузка списка...</div>';

    try {
        // Здесь в будущем: const friends = await api.getFriends();
        const friends = [
            { username: 'Ivan_Crypto', status: 'claimed' },
            { username: 'Ton_Master', status: 'pending' }
        ];

        if (friends.length === 0) {
            container.innerHTML = `
                <div class="empty-text" style="padding: 40px 20px; opacity: 0.6;">
                    <p>У тебя пока нет друзей.</p>
                    <p style="font-size: 12px;">Приглашай их и получай +5 🪙 за каждого!</p>
                </div>
            `;
        } else {
            container.innerHTML = friends.map(friend => `
                <div class="friend-card">
                    <div class="item-icon-wrapper">👤</div>
                    <div class="name-col" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <div style="font-weight: bold;">@${friend.username}</div>
                        <div style="font-size: 10px; color: ${friend.status === 'claimed' ? '#4ec0ca' : '#f1c40f'}">
                            ${friend.status === 'claimed' ? 'Бонус получен' : 'Ждет зачисления'}
                        </div>
                    </div>
                    <div class="score-col">
                        ${friend.status === 'pending' ? 
                            `<button class="primary-btn claim-mini-btn" data-user="${friend.username}" style="padding: 5px 12px; font-size: 12px; width: auto; height: auto; box-shadow: 0 2px 0 #b36b15;">+5 🪙</button>` 
                            : '<span style="color: #4ec0ca; font-size: 20px;">✅</span>'}
                    </div>
                </div>
            `).join('');

            // Кнопки забора бонуса
            container.querySelectorAll('.claim-mini-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const targetBtn = e.currentTarget;
                    targetBtn.disabled = true;
                    targetBtn.innerText = "⏳";

                    try {
                        // Здесь будет: await api.claimFriendReward(targetBtn.dataset.user);
                        
                        // Локальное обновление
                        if (state) {
                            state.coins += 5;
                            if (typeof updateGlobalUI === 'function') updateGlobalUI();
                        }

                        if (tg) {
                            tg.HapticFeedback.notificationOccurred('success');
                        }

                        // Меняем кнопку на галочку
                        const parent = targetBtn.parentElement;
                        parent.innerHTML = '<span style="color: #4ec0ca; font-size: 20px;">✅</span>';
                    } catch (err) {
                        console.error(err);
                        targetBtn.disabled = false;
                        targetBtn.innerText = "+5 🪙";
                    }
                };
            });
        }
    } catch (e) {
        console.error("[Friends] Error:", e);
        container.innerHTML = '<p class="empty-text">Не удалось загрузить друзей.</p>';
    }
}