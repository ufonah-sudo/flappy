import * as api from '../../api.js';

// Твой бот (убедись, что username совпадает без @)
const BOT_USERNAME = 'FlappyTonBird_bot'; 

export async function initFriends() {
    const state = window.state; 
    const tg = window.Telegram?.WebApp;
    const updateGlobalUI = window.updateGlobalUI;
    
    const container = document.querySelector('#scene-friends #friends-content');
    const inviteBtn = document.getElementById('btn-invite-real');
    
    // --- 1. ЛОГИКА КНОПКИ ПРИГЛАШЕНИЯ (Деревянная) ---
    if (inviteBtn) {
        // Добавляем класс стиля (если он не добавлен в HTML)
        inviteBtn.className = 'wooden-btn'; 
        
        // Удаляем старые слушатели (клонируя элемент), чтобы не дублировать клики при перезаходе в комнату
        const newBtn = inviteBtn.cloneNode(true);
        inviteBtn.parentNode.replaceChild(newBtn, inviteBtn);
        
        newBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const userId = state?.user?.id || tg?.initDataUnsafe?.user?.id || '0';
            const inviteLink = `https://t.me/${BOT_USERNAME}/game?startapp=${userId}`;
            const text = "Залетай в Flappy TON! 🐦 Монеты за друзей!";
            const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
            
            if (tg && tg.openTelegramLink) {
                tg.openTelegramLink(shareLink);
                if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            } else {
                window.open(shareLink, '_blank');
            }
        };
    }

    if (!container) return;

    // --- 2. ОТРИСОВКА СПИСКА ДРУЗЕЙ ---
    container.innerHTML = '<div class="loading-text" style="color:#aaa; margin-top:20px; text-align:center;">Загрузка списка...</div>';

    try {
        // Здесь можно раскомментировать запрос к API, если он готов:
        // const friends = await api.getFriends();
        // Пока берем из стейта:
        const friends = state.user?.friends || []; 
        
        if (friends.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 20px; color: #ccc;">
                    <p>У тебя пока нет друзей.</p>
                    <p style="font-size: 12px; margin-top: 5px;">Пригласи и получи +5 <span class="coin-icon-img">🟡</span></p>
                </div>
            `;
        } else {
            container.innerHTML = friends.map(friend => `
                <div class="friend-card">
                    <div class="item-icon-wrapper">👤</div>
                    <div class="name-col" style="flex-grow: 1; overflow: hidden;">
                        <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">@${friend.username}</div>
                        <div style="font-size: 10px; color: ${friend.status === 'claimed' ? '#4ec0ca' : '#f1c40f'}">
                            ${friend.status === 'claimed' ? 'Бонус получен' : 'Ждет зачисления'}
                        </div>
                    </div>
                    <div class="score-col">
                        ${friend.status === 'pending' ? 
                            `<button class="primary-btn claim-mini-btn" data-user="${friend.username}" style="padding: 6px 10px; font-size: 12px; width: auto; height: auto;">+5 🟡</button>` 
                            : '<span style="color: #4ec0ca; font-size: 20px;">✅</span>'}
                    </div>
                </div>
            `).join('');

            // --- 3. ЛОГИКА СБОРА НАГРАД ---
            container.querySelectorAll('.claim-mini-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const targetBtn = e.currentTarget;
                    if (targetBtn.disabled) return;
                    
                    targetBtn.disabled = true;
                    targetBtn.innerText = "⏳";
                    
                    try {
                        // Вызов API
                        await api.claimFriendReward(targetBtn.dataset.user);
                        
                        state.coins += 5;
                        if(updateGlobalUI) updateGlobalUI();
                        if(tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                        
                        // Заменяем кнопку на галочку
                        targetBtn.parentElement.innerHTML = '<span style="color: #4ec0ca; font-size: 20px;">✅</span>';
                        
                    } catch (err) {
                        console.error(err);
                        targetBtn.disabled = false;
                        targetBtn.innerText = "+5 🟡";
                        if(tg?.showAlert) tg.showAlert("Ошибка: " + err.message);
                    }
                };
            });
        }
    } catch (e) {
        console.error("[Friends] Error:", e);
        container.innerHTML = '<p class="empty-text" style="text-align:center;">Не удалось загрузить список.</p>';
    }
}
