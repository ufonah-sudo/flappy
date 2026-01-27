/**
 * js/rooms/career_map.js - ЛОГИКА КАРТЫ (Минимализм)
 */
import * as api from '../../api.js';
import { LEVELS } from '../levels.js';

export function initCareerMap() {
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    const container = document.querySelector('#scene-career-map #career-map-content');

    if (!container) return;

    // Очищаем контейнер и создаем обертку для дороги
    container.innerHTML = '<div class="career-road"></div>';
    const road = container.querySelector('.career-road');

    // Берем текущий уровень из стейта (если нет, то 1)
    const maxLevel = state.user?.max_level || 1;

    // Рисуем уровни (в обратном порядке, чтобы новые были сверху, или по порядку - как тебе удобнее)
    // Давай сделаем классический путь снизу вверх
    [...LEVELS].forEach((lvl, index) => {
        const levelNum = lvl.id;
        
        // Определение статуса
        let status = 'locked';
        if (levelNum < maxLevel) status = 'completed';
        else if (levelNum === maxLevel) status = 'current';

        // Паттерн "Змейка" (Центр -> Право -> Центр -> Лево)
        const posPattern = ['pos-center', 'pos-right', 'pos-center', 'pos-left'];
        const positionClass = posPattern[index % 4];

        const row = document.createElement('div');
        row.className = `level-row ${positionClass}`;
        
        // Создаем ноду уровня
        const node = document.createElement('div');
        node.className = `level-node ${status}`;
        node.dataset.id = levelNum;
        
        // Внутреннее наполнение ноды
        if (status === 'locked') {
            node.innerHTML = '<span class="lock-icon">🔒</span>';
        } else if (status === 'completed') {
            node.innerHTML = `<span>${levelNum}</span><div class="check-mark">✔</div>`;
        } else {
            // Текущий уровень
            node.innerHTML = `<span>${levelNum}</span><div class="current-glow"></div>`;
        }
        
        row.appendChild(node);
road.prepend(row);
        // Обработка клика
        if (status !== 'locked') {
            node.onclick = async () => {
                // Вибрация
                if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

                // Проверка энергии
                if (state.lives < 1) {
                    tg?.showAlert("Не хватает Энергии ⚡! Подожди восстановления.");
                    return;
                }

                const originalHTML = node.innerHTML;
                node.innerHTML = '<div class="spinner"></div>';
                
                try {
                    // Запрос на старт уровня (списываем энергию на сервере)
                    const res = await api.apiRequest('career2', 'POST', { 
                        action: 'start_level', 
                        level: levelNum 
                    });

                    if (res && res.success) {
                        state.lives = res.lives;
                        window.updateGlobalUI();
                        
                        // Переход в игру
                     state.currentMode = 'career'; 
                        window.showRoom('game');
                        
                        if (window.careerGame) {
                            window.careerGame.startLevel(lvl);
                        }
                    } else {
                        throw new Error(res.error || "Ошибка старта");
                    }
                } catch (e) {
                    node.innerHTML = originalHTML;
                    tg?.showAlert("Ошибка: " + e.message);
                }
            };
        }
    });

    // Авто-скролл к текущему уровню
    setTimeout(() => {
        const currentNode = container.querySelector('.level-node.current');
        if (currentNode) {
            currentNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}