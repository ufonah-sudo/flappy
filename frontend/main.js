/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Оптимизирован для Fullscreen в Telegram WebApp
 */

// --- 1. ИМПОРТЫ ---
import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js';
import { WalletManager } from './wallet.js';

import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   --------------------------------------------------------- */
const state = { 
    user: null,
    coins: 0,
    lives: 3,
    crystals: 0,
    inventory: [],
    currentMode: 'classic',
    settings: { sound: true, music: true },
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 }
};

/* ---------------------------------------------------------
   3. КЭШИРОВАНИЕ SCENES (ЭКРАНОВ)
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
   4. ФУНКЦИИ ГЕОМЕТРИИ (УБИРАЕМ ЗАЗОРЫ)
   --------------------------------------------------------- */
function fixViewport() {
    // Берем реальную высоту окна
    const vh = window.innerHeight;
    const root = document.getElementById('root');
    
    // Принудительно ставим высоту всем контейнерам
    document.documentElement.style.height = `${vh}px`;
    document.body.style.height = `${vh}px`;
    if (root) root.style.height = `${vh}px`;
    
    // Скроллим в начало, чтобы убрать артефакты адресной строки
    window.scrollTo(0, 0);

    // Обновляем движки
    if (window.game) window.game.resize();
    if (window.arcadeGame) window.arcadeGame.resize();
}

/* ---------------------------------------------------------
   5. НАВИГАЦИЯ (showRoom)
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем всё
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    
    // Показываем нужное
    const target = scenes[roomName];
    if (target) target.classList.remove('hidden');

    // Логика Хедера
    const header = document.getElementById('header');
    if (header) {
        const isGameUI = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = isGameUI ? 'none' : 'flex';
    }

    // Логика нижней панели
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu'].includes(roomName);
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    // Запуск игры
    if (roomName === 'game') {
        const isClassic = state.currentMode === 'classic';
        const engine = isClassic ? window.game : window.arcadeGame;
        if (engine) {
            engine.resize(); 
            engine.start(); 
        }
    }

    // Инициализация модулей комнат
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
        } catch (e) { console.warn(`Room init skipped for ${roomName}`); }
    }, 50);
}
window.showRoom = showRoom;

/* ---------------------------------------------------------
   6. ИНИЦИАЛИЗАЦИЯ (INIT)
   --------------------------------------------------------- */
async function init() {
    // Настройка Telegram
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#4ec0ca');
        tg.setBackgroundColor('#4ec0ca');
    }

    // Жесткая фиксация вьюпорта (несколько раз для iOS)
    fixViewport();
    [100, 300, 600, 1000].forEach(delay => setTimeout(fixViewport, delay));
    window.addEventListener('resize', fixViewport);

    // Инициализация движков
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }

    // Покупки
    window.addEventListener('buy_item', async (e) => {
        const { id, price, type, powerupType } = e.detail;
        if (state.coins >= price) {
            state.coins -= price;
            if (type === 'powerup') {
                state.powerups[powerupType] = (state.powerups[powerupType] || 0) + 1;
            } else {
                if (!state.inventory.includes(id)) state.inventory.push(id);
            }
            tg?.HapticFeedback.notificationOccurred('success');
            updateGlobalUI();
            await saveData();
        }
    });

    // Привязка кнопок
    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => {
            tg?.HapticFeedback.impactOccurred('light');
            showRoom(room);
        };
    };

    bind('btn-shop', 'shop');
    bind('btn-inventory', 'inventory');
    bind('btn-friends', 'friends');
    bind('btn-settings', 'settings');
    bind('btn-home-panel', 'home');
    bind('btn-start', 'modeSelection');
    bind('btn-back-to-home', 'home');
    bind('top-btn', 'leaderboard');
    bind('daily-btn', 'daily');

    // Выбор режима
    document.getElementById('btn-mode-classic').onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    document.getElementById('btn-mode-arcade').onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };

    // Пауза и выход
    document.getElementById('pause-btn').onclick = () => {
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
        showRoom('pauseMenu');
    };
    document.getElementById('btn-resume').onclick = () => showRoom('game');
    document.getElementById('btn-exit-home').onclick = () => showRoom('home');
    document.getElementById('btn-exit-gameover').onclick = () => showRoom('home');
    document.getElementById('btn-restart').onclick = () => showRoom('game');

    // Загрузка данных
    try {
        const auth = await api.authPlayer(tg?.initDataUnsafe?.start_param || "");
        if (auth?.user) {
            Object.assign(state, {
                user: auth.user,
                coins: auth.user.coins ?? 0,
                lives: auth.user.lives ?? 3,
                inventory: auth.user.inventory ?? [],
                powerups: auth.user.powerups ?? state.powerups
            });
        }
    } catch (e) { console.error("Auth failed"); }

    window.state = state;
    updateGlobalUI();
    showRoom('home'); 
}

/* ---------------------------------------------------------
   7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    saveData();
    api.saveScore(score).catch(() => {});
}

async function saveData() {
    localStorage.setItem('game_state', JSON.stringify(state));
    try { if (api.syncState) await api.syncState(state); } catch (e) {}
}

function updateGlobalUI() {
    const coins = document.getElementById('header-coins');
    if (coins) coins.innerText = Number(state.coins).toLocaleString();
    
    document.querySelectorAll('.stat-lives').forEach(el => el.innerText = state.lives);
}

window.updateGlobalUI = updateGlobalUI;
window.saveData = saveData;

// ЗАПУСК
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };