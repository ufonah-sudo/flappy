/**
 * js/rooms/career_map.js - ЛОГИКА КАРТЫ УРОВНЕЙ
 */
import * as api from '../../api.js';
import { LEVELS } from '../../levels.js'; // Конфиг уровней

export function initCareerMap() {
    const state = window.state;
    const tg = window.Telegram?.WebApp;
    const container = document.querySelector('#scene-career-map #career-map-content');

    if (!container) return;

    // Очищаем и создаем обертку для дороги
    container.innerHTML = '<div class="career-road"></div>';
    const road = container.querySelector('.career-road');

    // Текущий прогресс игрока
    const maxLevel = state.user?.max_level || 1;

    // Генерируем уровни (идем по массиву)
    LEVELS.forEach((lvl, index) => {
        const levelNum = lvl.id;
        
        // Определяем состояние
        let status = 'locked';
        if (levelNum < maxLevel) status = 'completed';
        else if (levelNum === maxLevel) status = 'current';

        // Определяем позицию (Змейка)
        // 1-Центр, 2-Право, 3-Центр, 4-Лево... и по кругу
        const posPattern = ['center', 'pos-right', 'center', 'pos-left'];
        const positionClass = posPattern[index % 4];

        // Создаем HTML элемента
        const row = document.createElement('div');
        row.className = `level-row ${positionClass}`;
        
        row.innerHTML = `
            <div class="level-node ${status}" data-id="${levelNum}">
                ${levelNum}
            </div>
        `;
        
        // Добавляем в дорогу
        road.appendChild(row);

        // КЛИК ПО УРОВНЮ
        const node = row.querySelector('.level-node');
        if (status !== 'locked') {
            node.onclick = async () => {
                // Эффект нажатия
                if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

                // 1. Проверка Энергии
                if (state.lives < 1) {
                    tg?.showAlert("Не хватает Энергии ⚡! Подожди или купи за кристаллы.");
                    return;
                }

                // 2. Анимация загрузки на кнопке
                const originalText = node.innerText;
                node.innerText = "⏳";
                
                try {
                    // 3. Запрос на сервер (Списание энергии)
                    const res = await api.apiRequest('career', 'POST', { 
                        action: 'start_level', 
                        level: levelNum 
                    });

                    if (res && res.success) {
                        // Обновляем энергию локально
                        state.lives = res.lives;
                        window.updateGlobalUI(); // Обновляем хедер

                        // 4. ЗАПУСК ИГРЫ
                        // Переходим на экран игры
                        window.showRoom('game');
                        
                        // Скрываем обычный интерфейс (кнопки паузы, счет классики) если надо
                        // Но движок сам отрисует всё.
                        // Главное: Переключаем режим в state
                        state.currentMode = 'career'; 

                        // Запускаем движок карьеры
                        if (window.careerGame) {
                            // Передаем конфиг этого уровня
                            window.careerGame.startLevel(lvl);
                        } else {
                            console.error("Движок карьеры не найден!");
                        }

                    } else {
                        throw new Error(res.error || "Ошибка старта");
                    }
                } catch (e) {
                    console.error(e);
                    tg?.showAlert("Ошибка: " + e.message);
                    node.innerText = originalText;
                }
            };
        }
    });
}
