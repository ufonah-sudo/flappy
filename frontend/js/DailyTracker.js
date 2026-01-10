/**
 * DailyTracker.js - Центральный трекер для выполнения ежедневных заданий.
 * Он "слушает" события из игры и обновляет прогресс.
 */
import * as api from '../api.js';

let syncTimeout = null; // Таймер, чтобы не спамить сервер

class DailyTracker {
    constructor() {
        // Начинаем слушать глобальные игровые события
        window.addEventListener('game_event', this.handleEvent.bind(this));
        console.log("🕵️ Daily Tracker активирован.");
    }

    // Центральный обработчик всех событий
    handleEvent(event) {
        const { type, data } = event.detail; // Тип события: 'pipe_passed', 'coin_collected', etc.
        const state = window.state;

        if (!state.user?.daily_challenges) return;

        let challengeUpdated = false;

        // Ищем задания, связанные с этим событием
        state.user.daily_challenges.forEach(ch => {
            if (this.isChallengeRelated(ch, type, data)) {
                if ((ch.progress || 0) < ch.target) {
                    ch.progress = (ch.progress || 0) + 1;
                    challengeUpdated = true;
                    console.log(`📈 Прогресс задания '${ch.id}': ${ch.progress}/${ch.target}`);
                }
            }
        });

        // Если что-то обновилось, отправляем на сервер (с задержкой)
        if (challengeUpdated) {
            this.syncWithServer(state.user.daily_challenges);
        }
    }

    // Проверяет, подходит ли событие под задание
    isChallengeRelated(challenge, eventType, eventData) {
        const id = challenge.id;
        if (eventType === 'pipe_passed' && id.startsWith('fly_')) return true;
        if (eventType === 'coin_collected' && id.startsWith('coins_')) return true;
        if (eventType === 'round_started' && id.startsWith('play_')) return true;
        if (eventType === 'powerup_used' && id.startsWith('use_')) {
            // Если задание, например, "use_3_shields", проверяем, что id способности совпадает
            if (id.includes(eventData.id)) return true;
        }
        return false;
    }

    // Отправка прогресса на сервер с задержкой в 3 секунды
    syncWithServer(challenges) {
        // Сбрасываем старый таймер, если он был
        if (syncTimeout) clearTimeout(syncTimeout);

        // Ставим новый
        syncTimeout = setTimeout(() => {
            console.log("💾 Отправка прогресса заданий на сервер...");
            api.apiRequest('daily', 'POST', {
                action: 'update_challenges',
                challenges: challenges
            });
        }, 3000); // 3 секунды
    }
}

// Экспортируем, чтобы подключить в main.js
export { DailyTracker };
