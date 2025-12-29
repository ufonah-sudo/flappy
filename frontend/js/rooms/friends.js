import * as api from '../../api.js';

// Твой бот (убедись, что username совпадает без @)
const BOT_USERNAME = 'FlappyTonBird_bot'; 

export async function initFriends() {
    const state = window.state; 
    const tg = window.Telegram?.WebApp;
    const updateGlobalUI = window.updateGlobalUI;
    
    const container = document.querySelector('#scene-friends .friends-list');
    const inviteBtn = document.getElementById('btn-invite-real');
    
    if (!container || !inviteBtn) return;

    // 1. Формируем реферальную ссылку (Telegram автоматически подхватит startapp)
    const userId = tg?.initDataUnsafe?.user?.id || state?.user?.id || '0';
    const inviteLink = `https://t.me/${BOT_USERNAME}/game?startapp=${userId}`;

    // 2. Исправленная логика кнопки "Пригласить"
    inviteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const text = "Лети со мной в Flappy TON! 🐦 Заработай реальные монеты! 💰";
        // Используем метод tg.openTelegramLink для надежности внутри приложения
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
        
        if (tg && tg.openTelegramLink) {
            tg.openTelegramLink(shareLink);
            tg.HapticFeedback?.impactOccurred('medium');
        } else {
            window.open(shareLink, '_blank');
        }
    };

    // 3. Отрисовка списка с проверкой данных
    container.innerHTML = '<div class="loading-text" style="color:#aaa; margin-top:20px; text-align:center;">Загрузка списка...</div>';

    try {
        // Попытка получить реальных друзей из state (которые пришли при логине в main.js)
        // Или запрашиваем через API
        let friends = state.user?.friends || []; 
        
        // Если API готово, раскомментируй:
        // friends = await api.getFriends();

        if (friends.length === 0) {
            container.innerHTML = `
                <div class="empty-text" style="padding: 40px 20px; opacity: 0.6; text-align:center;">
                    <p>У тебя пока нет друзей.</p>
                    <p style="font-size: 12px;">Приглашай их и получай +5 🪙 за каждого!</p>
                </div>
            `;
        } else {
            container.innerHTML = friends.map(friend => `
                <div class="friend-card" style="display: flex; align-items: center; background: rgba(0,0,0,0.2); margin-bottom: 8px; padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <div class="item-icon-wrapper" style="font-size: 24px; margin-right: 12px;">👤</div>
                    <div class="name-col" style="flex-grow: 1; overflow: hidden;">
                        <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">@${friend.username}</div>
                        <div style="font-size: 10px; color: ${friend.status === 'claimed' ? '#4ec0ca' : '#f1c40f'}">
                            ${friend.status === 'claimed' ? 'Бонус получен' : 'Ждет зачисления'}
                        </div>
                    </div>
                    <div class="score-col">
                        ${friend.status === 'pending' ? 
                            `<button class="primary-btn claim-mini-btn" data-user="${friend.username}" style="padding: 5px 12px; font-size: 12px; width: auto; height: auto;">+5 🪙</button>` 
                            : '<span style="color: #4ec0ca; font-size: 20px;">✅</span>'}
                    </div>
                </div>
            `).join('');

            // Навешиваем клики на кнопки забора наград
            container.querySelectorAll('.claim-mini-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const targetBtn = e.currentTarget;
                    if (targetBtn.disabled) return;
                    
                    targetBtn.disabled = true;
                    targetBtn.innerText = "⏳";

                    try {
                        // Вызов API (добавь эту функцию в api.js)
                        await api.claimFriendReward(targetBtn.dataset.user);
                        
                        state.coins += 5;
                        updateGlobalUI();
                        tg?.HapticFeedback.notificationOccurred('success');

                        // Визуальная замена кнопки
                        targetBtn.parentElement.innerHTML = '<span style="color: #4ec0ca; font-size: 20px;">✅</span>';
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
        container.innerHTML = '<p class="empty-text" style="text-align:center;">Не удалось загрузить список.</p>';
    }
}