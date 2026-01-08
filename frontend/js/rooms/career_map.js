/**
 * js/rooms/career_map.js - ЛОГИКА КАРТЫ
 */
import * as api from '../../api.js';
import { LEVELS } from '../levels.js';

export function initCareerMap() {
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    const container = document.querySelector('#scene-career-map #career-map-content');

    if (!container) return;

    // Чистим и строим дорогу
    container.innerHTML = '<div class="career-road"></div>';
    const road = container.querySelector('.career-road');

    const maxLevel = state.user?.max_level || 1;

    // Рисуем уровни снизу вверх
    LEVELS.forEach((lvl, index) => {
        const levelNum = lvl.id;
        
        // Статус
        let status = 'locked';
        if (levelNum < maxLevel) status = 'completed';
        else if (levelNum === maxLevel) status = 'current';

        // Позиция (Змейка)
        const posPattern = ['center', 'pos-right', 'center', 'pos-left'];
        const positionClass = posPattern[index % 4];

        const row = document.createElement('div');
        row.className = `level-row ${positionClass}`;
        
        row.innerHTML = `
            <div class="level-node ${status}" data-id="${levelNum}">
                ${levelNum}
            </div>
        `;
        
        road.appendChild(row);

        // Клик
        const node = row.querySelector('.level-node');
        if (status !== 'locked') {
            node.onclick = async () => {
                if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

                if (state.lives < 1) {
                    tg?.showAlert("Не хватает Энергии ⚡!");
                    return;
                }

                const originalText = node.innerText;
                node.innerText = "⏳";
                
                try {
                    const res = await api.apiRequest('career', 'POST', { 
                        action: 'start_level', level: levelNum 
                    });

                    if (res && res.success) {
                        state.lives = res.lives;
                        window.updateGlobalUI();
                        
                        // Запуск уровня
                        window.showRoom('game');
                        state.currentMode = 'career'; 
                        if (window.careerGame) {
                            window.careerGame.startLevel(lvl);
                        }
                    } else {
                        throw new Error(res.error || "Ошибка");
                    }
                } catch (e) {
                    node.innerText = originalText;
                    console.error(e);
                }
            };
        }
    });
}
