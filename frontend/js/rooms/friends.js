/**
 * js/rooms/friends.js - ДРУЗЬЯ (СТИЛЬ МАГАЗИНА)
 */
import * as api from '../../api.js';

const BOT_USERNAME = 'FlappyTonBird_bot'; // Убедись, что это твой реальный юзернейм бота

export async function initFriends() {
    const state = window.state; 
    const tg = window.Telegram?.WebApp;
    // Находим контейнер для списка друзей
    const friendsListContainer = document.querySelector('#scene-friends #friends-content');
    // Находим кнопку "Пригласить"
    const inviteBtn = document.getElementById('btn-invite-real');
    
    // Если контейнеров нет, выходим
    if (!friendsListContainer || !inviteBtn) return;

    // --- 1. ЛОГИКА КНОПКИ "ПРИГЛАСИТЬ" ---
    // Формируем реферальную ссылку
    const userId = state?.user?.id || tg?.initDataUnsafe?.user?.id || '0';
    const inviteLink = `https://t.me/${BOT_USERNAME}/game?startapp=${userId}`;
    const shareText = "Лети со мной в Flappy TON! 🐦 Заработай реальные монеты! 💰";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;

    // Присваиваем кнопке класс "деревянной" и вешаем обработчик
    inviteBtn.className = 'btn-wooden'; // Используем наш общий стиль
    inviteBtn.innerHTML = 'ПРИГЛАСИТЬ ДРУГА'; // Обновляем текст
    
    // Удаляем старые слушатели, чтобы избежать дублирования
    const newInviteBtn = inviteBtn.cloneNode(true);
    inviteBtn.parentNode.replaceChild(newInviteBtn, inviteBtn);

    newInviteBtn.onclick = (e) => {
        e.preventDefault();
        tg?.HapticFeedback?.impactOccurred('medium');
        if (tg && tg.openTelegramLink) {
            tg.openTelegramLink(shareUrl);
        } else {
            window.open(shareUrl, '_blank');
        }
    };

    // --- 2. ОТРИСОВКА СПИСКА ДРУЗЕЙ ---
    friendsListContainer.innerHTML = '<div style="text-align:center; color:#aaa; padding: 20px;">Загрузка списка друзей...</div>';

    try {
        // Получаем список друзей с сервера (или из state, если он уже там)
        const friends = state.user?.friends || await api.getFriends(); // В ideal случае, getFriends() должен использоваться
        state.user.friends = friends; // Обновляем стейт

        if (friends.length === 0) {
            friendsListContainer.innerHTML = `
                <div class="powerup-card empty" style="border-color: #aaa; background: #f0f0f0; margin-top: 20px;">
                    <div style="font-size: 50px; opacity: 0.3;">🤝</div>
                    <p style="color: #666; font-size: 14px; margin-top: 10px;">Приглашай друзей и получай награды!</p>
                </div>
            `;
        } else {
            friendsListContainer.innerHTML = friends.map(friend => {
                const isClaimed = friend.status === 'claimed';
                const buttonText = isClaimed ? '✅' : '+5 🟡';
                const buttonColor = isClaimed ? '#2ecc71' : '#f7d51d';
                const buttonActionClass = isClaimed ? 'disabled' : 'claim-friend-reward-btn';
                
                return `
                    <div class="powerup-card" style="border-color: ${buttonColor};">
                        <div style="display: flex; align-items: center;">
                            <div class="icon">👤</div>
                            <div>
                                <div class="name">@${friend.username || 'Игрок'}</div>
                                <div class="desc">${isClaimed ? 'Награда получена' : 'Ожидает'}</div>
                            </div>
                        </div>
                        <div>
                            <button class="${buttonActionClass} action-btn" data-friend-id="${friend.referred_id}" data-friend-username="${friend.username}"
                                style="background:${buttonColor}; ${isClaimed ? 'pointer-events: none; opacity: 0.7;' : ''}">
                                ${buttonText}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // --- 3. ЛОГИКА СБОРА НАГРАД ЗА ДРУЗЕЙ ---
            friendsListContainer.querySelectorAll('.claim-friend-reward-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const button = e.currentTarget;
                    const friendUsername = button.dataset.friendUsername;
                    const friendId = button.dataset.friendId;

                    if (button.disabled) return;

                    button.disabled = true;
                    button.innerHTML = "⏳";
                    
                    try {
                        const res = await api.claimFriendReward(friendUsername); // Отправляем username
                        
                        if (res.success) {
                            state.coins += 5; // Начисляем монеты
                            updateGlobalUI(); // Обновляем хедер
                            
                            // Обновляем статус друга в локальном стейте
                            const friendEntry = state.user.friends.find(f => f.referred_id == friendId);
                            if(friendEntry) friendEntry.status = 'claimed';

                            tg?.HapticFeedback?.notificationOccurred('success');
                            tg?.showAlert(`Вы получили 5 🟡 за ${friendUsername}!`);
                            
                            // Визуально меняем кнопку на галочку
                            button.innerHTML = '✅';
                            button.style.background = '#2ecc71';
                            button.style.pointerEvents = 'none';
                        } else {
                            throw new Error(res.message || res.error || "Ошибка");
                        }
                    } catch (err) {
                        console.error(err);
                        button.disabled = false;
                        button.innerHTML = '+5 🟡';
                        tg?.showAlert(err.message || "Не удалось получить награду");
                    }
                };
            });
        }
    } catch (e) {
        console.error("[Friends] Error:", e);
        friendsListContainer.innerHTML = `<p style="text-align:center; color:red; padding: 20px;">Не удалось загрузить список друзей: ${e.message}</p>`;
    }
}
