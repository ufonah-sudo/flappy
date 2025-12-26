import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js'; 
import { WalletManager } from './wallet.js';

// Импорты логики комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;

// 1. Глобальное состояние приложения (Ничего не удалено)
const state = { 
    user: null, 
    coins: 0, 
    lives: 3, 
    crystals: 1,
    currentMode: 'classic',
    settings: {
        sound: true,
        music: true
    },
    powerups: {
        heart: 3,
        shield: 3,
        gap: 3,
        magnet: 3,
        ghost: 3
    }
};

// 2. Сцены (Проверь ID в HTML!)
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

/**
 * Основная функция навигации
 */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все сцены
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (!target) return;
    target.classList.remove('hidden');

    // --- Управление Header (Балансы) ---
    const header = document.querySelector('.header-balances') || document.getElementById('header');
    if (header) {
        const hideHeaderOn = ['game', 'pauseMenu', 'gameOver', 'modeSelection'];
        header.classList.toggle('hidden', hideHeaderOn.includes(roomName));
    }

    // --- Кнопка Паузы ---
    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        pauseTrigger.classList.toggle('hidden', roomName !== 'game');
    }

    // --- Нижняя Панель Навигации (ВОЗВРАЩЕНО) ---
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideOn = ['game', 'gameOver', 'modeSelection', 'pauseMenu'];
        if (hideOn.includes(roomName)) {
            bottomPanel.style.display = 'none';
        } else {
            bottomPanel.style.display = 'flex';
        }
    }

    // --- Управление игровыми движками ---
    const activeEngine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
    const idleEngine = state.currentMode === 'classic' ? window.arcadeGame : window.game;

    if (roomName === 'game') {
        if (idleEngine) idleEngine.isRunning = false;
        if (activeEngine) {
            activeEngine.resize();
            if (activeEngine.init) activeEngine.init(); // Инициализация аркады/классики
            activeEngine.isRunning = true;
            activeEngine.start(); 
        }
    } else if (roomName === 'pauseMenu') {
        if (activeEngine) activeEngine.isRunning = false;
    } else {
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // --- Инициализация логики конкретной комнаты ---
    try {
        switch(roomName) {
            case 'shop':      initShop(); break;
            case 'inventory': initInventory(); break;
            case 'friends':   initFriends(); break;
            case 'daily':     initDaily(); break;
            case 'leaderboard': initLeaderboard(); break;
            case 'settings':  initSettings(); break;
        }
        updateGlobalUI(); 
    } catch (err) { console.error(`[RoomInit] Ошибка в ${roomName}:`, err); }
}

window.showRoom = showRoom;

/**
 * Инициализация при загрузке
 */
async function init() {
    if (tg) {
        tg.ready();
        tg.expand(); 
        tg.enableClosingConfirmation();
    }

    // Кошелек
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected ? "Connected" : "Disconnected");
        });
    } catch (e) { console.error("[TON] Ошибка кошелька:", e); }
    
    // Движки
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
        window.arcadeGame = new ArcadeGame(canvas, handleGameOver);
    }

    // Универсальный биндер кликов
    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { 
            e.preventDefault();
            tg?.HapticFeedback.impactOccurred('light');
            showRoom(room); 
        };
    };

    // Все твои кнопки на месте
    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-top-icon', 'leaderboard');
    bindClick('btn-daily-icon', 'daily');
    bindClick('btn-start', 'modeSelection');

    // Режимы
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { 
        state.currentMode = 'classic'; 
        showRoom('game'); 
    };
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { 
        state.currentMode = 'arcade'; 
        showRoom('game'); 
    };
    bindClick('btn-back-to-home', 'home');

    // Кнопки интерфейса
    const btnPause = document.getElementById('btn-pause-trigger');
    if (btnPause) btnPause.onclick = () => showRoom('pauseMenu');

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.onclick = () => showRoom('game');

    const btnExit = document.getElementById('btn-exit-home');
    if (btnExit) btnExit.onclick = () => showRoom('home');

    // Звук
    const btnSound = document.getElementById('btn-toggle-sound');
    if (btnSound) {
        btnSound.onclick = () => {
            state.settings.sound = !state.settings.sound;
            btnSound.innerText = state.settings.sound ? "🔊 Sound: ON" : "🔇 Sound: OFF";
        };
    }

    // Гейм овер кнопки
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = () => {
            if (state.powerups.heart > 0) {
                state.powerups.heart--; 
                updateGlobalUI();
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                if (engine) engine.revive(); 
                showRoom('game');
            }
        };
    }

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('game');

    const btnExitGameOver = document.getElementById('btn-exit-gameover');
    if (btnExitGameOver) btnExitGameOver.onclick = () => showRoom('home');

    // Авторизация
    try {
        const authData = await api.authPlayer(tg?.initDataUnsafe?.start_param || ""); 
        if (authData?.user) {
            Object.assign(state, {
                user: authData.user,
                coins: authData.user.coins ?? state.coins,
                lives: authData.user.lives ?? state.lives,
                crystals: authData.user.crystals ?? state.crystals
            });
            if (authData.user.powerups) state.powerups = { ...state.powerups, ...authData.user.powerups };
        }
    } catch (e) { console.error("[Auth Error]", e); }

    window.state = state; 
    updateGlobalUI();
    showRoom('home'); 
}

function handleGameOver(score, reviveUsed) {
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.style.display = reviveUsed ? 'none' : 'flex';
        btnRevive.innerHTML = `<span>USE HEART ❤️</span><small>(Left: ${state.powerups.heart})</small>`;
        btnRevive.style.opacity = state.powerups.heart > 0 ? "1" : "0.5";
    }
    
    showRoom('gameOver');
    api.saveScore(score).catch(e => console.error(e));
}

function updateGlobalUI() {
    if (!state) return;
    const setInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setInner('header-coins', state.coins.toLocaleString());
    setInner('header-crystals', state.crystals.toLocaleString());
    document.querySelectorAll('.stat-lives, #header-lives').forEach(el => el.innerText = state.lives);

    if (state.powerups) {
        Object.keys(state.powerups).forEach(key => {
            const badges = document.querySelectorAll(`.item-badge[data-powerup="${key}"]`);
            badges.forEach(badge => {
                badge.innerText = state.powerups[key];
                badge.classList.toggle('hidden', state.powerups[key] <= 0);
            });
        });
    }
}

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };