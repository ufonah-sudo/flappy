/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js) — ЧАСТЬ 1/2
 * Назначение: Импорты, Глобальный стейт, Навигация и Логика переключения комнат.
 */

// --- 1. ИМПОРТЫ МОДУЛЕЙ ---
import * as api from './api.js';           // Модуль API (Бэкенд)
import { Game } from './game.js';          // Движок Классики
import { ArcadeGame } from './arcade.js';  // Движок Аркады
import { WalletManager } from './wallet.js'; // TON Кошелек

// Импорт инициализаторов комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

// Инициализация Telegram SDK
const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   --------------------------------------------------------- */
const state = { 
    user: null,                // Данные профиля
    coins: 0,                  // Монеты
    lives: 3,                  // Энергия
    crystals: 0,               // Кристаллы
    currentMode: 'classic',    // Режим игры
    settings: { sound: true, music: true },
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 }
};

/* ---------------------------------------------------------
   3. КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ (SCENES)
   --------------------------------------------------------- */
const scenes = {
    home: document.getElementById('scene-home'),
    modeSelection: document.getElementById('scene-mode-selection'),
    game: document.getElementById('game-container'),
    shop: document.getElementById('scene-shop'),
    leaderboard: document.getElementById('scene-leaderboard'),
    friends: document.getElementById('scene-friends'),
    inventory: document.getElementById('scene-inventory'),
    daily: document.getElementById('scene-daily'),
    settings: document.getElementById('scene-settings'),
    gameOver: document.getElementById('game-over'),
    pauseMenu: document.getElementById('pause-menu')
};

/* ---------------------------------------------------------
   4. НАВИГАЦИЯ (showRoom)
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все сцены через добавление класса .hidden
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    
    // Показываем целевую сцену
    const target = scenes[roomName];
    if (!target) return console.error(`Ошибка: Сцена "${roomName}" не найдена!`);
    target.classList.remove('hidden');

    // Настройка Хедера (Баланс виден везде, кроме самой игры и оверлеев)
    const header = document.getElementById('header');
    if (header) {
        const isGameUI = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = isGameUI ? 'none' : 'flex';
    }

    // Кнопка Паузы (только внутри геймплея)
    const pauseBtn = document.getElementById('btn-pause-trigger');
    if (pauseBtn) pauseBtn.classList.toggle('hidden', roomName !== 'game');

    // Нижняя навигационная панель (Скрываем в игре и экранах выбора)
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu'].includes(roomName);
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    // Логика запуска игровых движков
    if (roomName === 'game') {
        // Принудительный сброс состояний перед стартом
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;

        const isClassic = state.currentMode === 'classic';
        
        // Показываем инвентарь способностей только в Аркаде
        const arcadeUI = document.querySelector('.ingame-ui-left') || document.getElementById('ingame-inventory');
        if (arcadeUI) arcadeUI.style.display = isClassic ? 'none' : 'flex';

        // Выбираем движок
        const engine = isClassic ? window.game : window.arcadeGame;
        if (engine) {
            engine.resize(); 
            engine.start(); 
        }
    } else if (roomName !== 'pauseMenu') {
        // Останавливаем все процессы, если мы не в игре и не на паузе
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // Инициализация контента комнат с задержкой (чтобы DOM успел обновиться)
    setTimeout(() => {
        try {
            switch(roomName) {
                case 'shop': initShop(); break;
                case 'inventory': initInventory(); break;
                case 'friends': initFriends(); break;
                case 'daily': initDaily(); break;
                case 'leaderboard': initLeaderboard(); break;
                case 'settings': initSettings(); break;
            }
            updateGlobalUI(); 
        } catch (e) { console.error(`Ошибка комнаты ${roomName}:`, e); }
    }, 10);
}

window.showRoom = showRoom;

// --- КОНЕЦ ЧАСТИ 1 ---
// Напиши "готов", и я пришлю вторую часть с функцией Init и обработкой UI.
/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js) — ЧАСТЬ 2/2
 * Назначение: Точка входа (init), логика кнопок, Game Over и обновление UI.
 */

/* ---------------------------------------------------------
   5. ИНИЦИАЛИЗАЦИЯ (init) - Запуск всего приложения
   --------------------------------------------------------- */
async function init() {
    // Сообщаем Telegram, что мы готовы и разворачиваем на весь экран
    if (tg) { tg.ready(); tg.expand(); }

    // Находим Canvas и привязываем к нему оба игровых движка
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        // Передаем колбэк handleGameOver, который сработает при столкновении
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }

    // Инициализация кошелька TON
    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet skip"); }

    // Универсальный хелпер для привязки кнопок к комнатам
    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            e.preventDefault(); 
            e.stopPropagation(); // Важно: чтобы клик по меню не заставлял птицу прыгать
            tg?.HapticFeedback.impactOccurred('light'); // Вибрация
            showRoom(room);
        };
    };

    // Привязываем все кнопки навигации из HTML
    bind('btn-shop', 'shop');
    bind('btn-inventory', 'inventory');
    bind('btn-friends', 'friends');
    bind('btn-settings', 'settings');
    bind('btn-home-panel', 'home');
    bind('btn-start', 'modeSelection');
    bind('btn-back-to-home', 'home');
    bind('top-btn', 'leaderboard');
    bind('btn-top-icon', 'leaderboard');
    bind('daily-btn', 'daily');
    bind('btn-daily-icon', 'daily');

    // Настройка кнопок выбора режима игры
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };

    // Логика кнопки ПАУЗЫ внутри игры
    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        pauseTrigger.onclick = (e) => {
            e.preventDefault();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    // Кнопки управления в меню паузы
    const resBtn = document.getElementById('btn-resume');
    if (resBtn) resBtn.onclick = () => showRoom('game');
    
    const exitBtn = document.getElementById('btn-exit-home');
    if (exitBtn) exitBtn.onclick = () => showRoom('home');

    // --- ЛОГИКА ЩИТА (ТОЛЬКО АРКАДА) ---
    const shieldBtn = document.getElementById('btn-use-shield') || document.getElementById('use-shield-btn');
    if (shieldBtn) {
        shieldBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (state.currentMode !== 'arcade') return; // Запрет в классике
            if (state.powerups.shield > 0) {
                // Если щит в данный момент не активен
                if (window.arcadeGame.activePowerups && !window.arcadeGame.activePowerups.shield) {
                    state.powerups.shield--; 
                    window.arcadeGame.activePowerups.shield = 420; // Активация на время
                    tg?.HapticFeedback.notificationOccurred('success');
                    updateGlobalUI();
                }
            }
        };
    }

    // --- ЛОГИКА ВОЗРОЖДЕНИЯ ---
    const reviveBtn = document.getElementById('btn-revive');
    if (reviveBtn) {
        reviveBtn.onclick = (e) => {
            e.preventDefault();
            if (state.powerups.heart > 0) {
                state.powerups.heart--;
                updateGlobalUI();
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                engine.revive(); // Метод внутри движка для продолжения игры
                showRoom('game');
            }
        };
    }

    // Кнопки после проигрыша (Game Over)
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.onclick = () => showRoom('game');
    
    const exitGO = document.getElementById('btn-exit-gameover');
    if (exitGO) exitGO.onclick = () => showRoom('home');

    // Загрузка данных игрока с бэкенда (Coins, Lives, Powerups)
   try {
    const auth = await api.authPlayer(tg?.initDataUnsafe?.start_param || "");
    if (auth?.user) {
        state.user = auth.user; // Сохраняем пользователя в стейт!
        state.coins = auth.user.coins ?? state.coins;
        state.lives = auth.user.lives ?? state.lives;
        state.crystals = auth.user.crystals ?? state.crystals;

        // Инициализация заданий, если их нет в ответе от API
        if (!state.user.daily_challenges) {
            state.user.daily_challenges = [
                { id: 1, text: "Fly through 10 pipes", target: 10, progress: 0, done: false },
                { id: 2, text: "Collect 50 coins", target: 50, progress: 0, done: false },
                { id: 3, text: "Use 1 ability", target: 1, progress: 0, done: false }
            ];
        }

        if (auth.user.powerups) {
            state.powerups = { ...state.powerups, ...auth.user.powerups };
        }
    }
} catch (e) { 
    console.error("Ошибка загрузки данных:", e);
    // Фолбэк: если API упало, создаем пустого юзера с заданиями, чтобы игра не зависла
    state.user = { daily_challenges: [
        { id: 1, target: 10, progress: 0, done: false },
        { id: 2, target: 50, progress: 0, done: false },
        { id: 3, target: 1, progress: 0, done: false }
    ]};
}


    // Финализация: прокидываем стейт в глобальное окно и показываем дом
    window.state = state;
    updateGlobalUI();
    showRoom('home'); 
}

/* ---------------------------------------------------------
   6. ОБРАБОТКА СМЕРТИ (GAME OVER)
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    
    const btnRev = document.getElementById('btn-revive');
    if (btnRev) {
        // Условие появления кнопки: есть сердце и оно не использовано в этом раунде
        const canRev = !reviveUsed && state.powerups.heart > 0;
        btnRev.classList.toggle('hidden', !canRev);
        btnRev.innerHTML = `USE HEART ❤️ <br><small>(${state.powerups.heart} LEFT)</small>`;
    }
    
    api.saveScore(score).catch(e => console.log("Score not saved:", e));
}

/* ---------------------------------------------------------
   7. СИНХРОНИЗАЦИЯ ИНТЕРФЕЙСА (UI)
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // Обновление текстовых значений монет и кристаллов
    const cEl = document.getElementById('header-coins');
    if (cEl) cEl.innerText = Number(state.coins).toLocaleString();
    
    const crEl = document.getElementById('header-crystals');
    if (crEl) crEl.innerText = state.crystals;

    // Обновление жизней во всех местах (хедер и статы)
    document.querySelectorAll('.stat-lives, #header-lives').forEach(el => {
        el.innerText = state.lives;
    });

    // Обновление бейджей (количества) для каждой способности в инвентаре
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val;
            // Если значение 0 — скрываем бейдж (кроме щита в игре)
            if (el.id !== 'shield-count') {
                el.classList.toggle('hidden', val <= 0);
            }
        });
    });

    // Визуальное состояние кнопки использования щита
    const sBtn = document.getElementById('btn-use-shield') || document.getElementById('use-shield-btn');
    if (sBtn) {
        const isArc = state.currentMode === 'arcade';
        const hasSh = state.powerups.shield > 0;
        sBtn.style.opacity = (isArc && hasSh) ? "1" : "0.5";
        sBtn.style.pointerEvents = isArc ? "auto" : "none";
    }
}

// Делаем функцию доступной глобально для модулей shop.js и daily.js
window.updateGlobalUI = updateGlobalUI;

// Окончательный запуск при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Экспорт необходимых данных
export { showRoom, state, updateGlobalUI };