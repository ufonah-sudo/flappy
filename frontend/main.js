/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Оптимизирован для Fullscreen по модели GiftMa
 */

import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js';

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;

// Состояние игры
const state = {
    coins: 0,
    currentMode: 'classic',
    user: null
};

// Ссылки на экраны (Scenes)
const scenes = {
    home: document.getElementById('scene-home'),
    modeSelection: document.getElementById('scene-mode-selection'),
    game: document.getElementById('game-container'), // Контейнер, где лежит канвас
    gameOver: document.getElementById('game-over')
};

/**
 * ФУНКЦИЯ ФИКСАЦИИ ЭКРАНА (ГЛАВНЫЙ СЕКРЕТ)
 */
function forceGeometry() {
    if (!tg) return;

    // 1. Разворачиваем на весь экран
    tg.expand();
    
    // 2. Берем реальную высоту видимой области
    const vh = window.innerHeight;
    
    // 3. Силой прописываем высоту всем критическим контейнерам
    document.documentElement.style.height = `${vh}px`;
    document.body.style.height = `${vh}px`;
    
    const root = document.getElementById('root');
    if (root) {
        root.style.height = `${vh}px`;
    }

    // 4. Убираем системные зазоры через прокрутку
    window.scrollTo(0, 0);

    // 5. Оповещаем игровые движки о ресайзе
    if (window.gameInstance) window.gameInstance.resize();
    if (window.arcadeInstance) window.arcadeInstance.resize();
}

/**
 * НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
 */
function showRoom(roomName) {
    // Скрываем все сцены
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });

    // Показываем нужную
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
    }

    // Если заходим в игру — стартуем движок
    if (roomName === 'game') {
        const engine = state.currentMode === 'classic' ? window.gameInstance : window.arcadeInstance;
        if (engine) {
            engine.start();
        }
    }
}

/**
 * ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
 */
async function init() {
    console.log("App Init Started");

    if (tg) {
        tg.ready();
        // Красим системные полоски сразу
        tg.setHeaderColor('#4ec0ca');
        tg.setBackgroundColor('#4ec0ca');
    }

    // Запускаем фикс геометрии сразу и через интервалы (для iOS)
    forceGeometry();
    [100, 300, 500, 1000].forEach(delay => setTimeout(forceGeometry, delay));

    // Инициализация канваса
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.gameInstance = new Game(canvas, (score) => handleGameOver(score));
        window.arcadeInstance = new ArcadeGame(canvas, (score) => handleGameOver(score));
    }

    // Привязка кнопок меню
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.onclick = () => {
            tg?.HapticFeedback.impactOccurred('medium');
            showRoom('modeSelection');
        };
    }

    const btnClassic = document.getElementById('btn-mode-classic');
    if (btnClassic) {
        btnClassic.onclick = () => {
            state.currentMode = 'classic';
            showRoom('game');
        };
    }

    const btnArcade = document.getElementById('btn-mode-arcade');
    if (btnArcade) {
        btnArcade.onclick = () => {
            state.currentMode = 'arcade';
            showRoom('game');
        };
    }

    // Следим за поворотом экрана или изменением размера
    window.addEventListener('resize', forceGeometry);

    // Показываем главный экран
    showRoom('home');
}

/**
 * ОБРАБОТКА ПРОИГРЫША
 */
function handleGameOver(score) {
    showRoom('gameOver');
    const finalScore = document.getElementById('final-score');
    if (finalScore) finalScore.innerText = score;
    
    // Сохранение очков через API
    api.saveScore(score).catch(err => console.error("Save score error:", err));
}

// Запуск при полной загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Экспортируем функции, если они нужны в других модулях
export { showRoom, state, forceGeometry };