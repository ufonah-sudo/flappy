/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Полностью совместим со структурой root и base.css
 */

import { Game } from './game.js';
import { ArcadeGame } from './arcade.js';
import * as api from './api.js';

// 1. Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;

// 2. Глобальное состояние
const state = {
    coins: 0,
    currentMode: 'classic',
    user: null
};

// 3. Ссылки на сцены
const scenes = {
    home: document.getElementById('scene-home'),
    modeSelection: document.getElementById('scene-mode-selection'),
    game: document.getElementById('game-container'),
    gameOver: document.getElementById('game-over')
};

/**
 * ФУНКЦИЯ ПРИНУДИТЕЛЬНОГО ПОЛНОГО ЭКРАНА
 * Самый важный блок для удаления зазоров
 */
function forceFullscreen() {
    if (!tg) return;

    tg.ready();
    tg.expand(); // Разворачиваем WebView на максимум

    // Берем реальную высоту окна (в Telegram vh может врать)
    const vh = window.innerHeight;
    
    // Силой устанавливаем высоту всем корневым элементам
    document.documentElement.style.height = `${vh}px`;
    document.body.style.height = `${vh}px`;
    
    const root = document.getElementById('root');
    if (root) {
        root.style.height = `${vh}px`;
    }

    // Красим системные области под цвет неба игры
    tg.setHeaderColor('#4ec0ca');
    tg.setBackgroundColor('#4ec0ca');

    // Скроллим в самый верх, чтобы убрать возможные сдвиги WebView
    window.scrollTo(0, 0);

    // Сообщаем игровым движкам об обновлении размера
    if (window.gameInstance) window.gameInstance.resize();
    if (window.arcadeInstance) window.arcadeInstance.resize();
}

/**
 * НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
 */
function showRoom(roomName) {
    // Скрываем все экраны
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });

    // Показываем целевой экран
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
    }

    // Логика запуска игры
    if (roomName === 'game') {
        const engine = state.currentMode === 'classic' ? window.gameInstance : window.arcadeInstance;
        if (engine) {
            engine.start();
        }
    }
}

/**
 * ГЛАВНАЯ ИНИЦИАЛИЗАЦИЯ
 */
async function init() {
    console.log("App Init...");

    // Вызываем фикс экрана сразу и через паузы (чтобы победить лаг iOS)
    forceFullscreen();
    [100, 300, 500, 1000].forEach(ms => setTimeout(forceFullscreen, ms));

    // Инициализация Canvas
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.gameInstance = new Game(canvas, (score) => handleGameOver(score));
        window.arcadeInstance = new ArcadeGame(canvas, (score) => handleGameOver(score));
    }

    // Привязка кликов
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.onclick = () => {
            tg?.HapticFeedback.impactOccurred('medium');
            showRoom('modeSelection');
        };
    }

    // Выбор режима
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

    // Кнопка выхода из Game Over
    const btnExit = document.getElementById('btn-exit-gameover');
    if (btnExit) {
        btnExit.onclick = () => showRoom('home');
    }

    // Следим за изменением размера экрана (например, при скрытии клавиатуры)
    window.addEventListener('resize', forceFullscreen);

    // Загрузка данных через API (если есть)
    try {
        const user = await api.authPlayer();
        state.user = user;
    } catch (e) {
        console.warn("Auth failed, playing as guest");
    }

    // Показываем главный экран
    showRoom('home');
}

/**
 * ЗАВЕРШЕНИЕ ИГРЫ
 */
function handleGameOver(score) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    // Сохраняем результат
    api.saveScore(score).catch(() => {});
}

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}