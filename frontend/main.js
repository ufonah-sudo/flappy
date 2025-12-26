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

// 1. Глобальное состояние приложения
const state = { 
    user: null, 
    coins: 0, 
    lives: 5, 
    crystals: 1,
    currentMode: 'classic',
    settings: {
        sound: true,
        music: true
    },
    powerups: {
        heart: 0, // Добавлено для логики возрождения
        shield: 0,
        gap: 0,
        magnet: 0,
        ghost: 0
    }
};

// Ссылки на экраны
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
    
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (!target) return;
    target.classList.remove('hidden');

    // --- Управление Header ---
    const header = document.getElementById('header');
    if (header) {
        header.style.display = (roomName === 'game' || roomName === 'pauseMenu' || roomName === 'gameOver') ? 'none' : 'flex';
    }

    // --- Управление Паузой ---
    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        pauseTrigger.classList.toggle('hidden', roomName !== 'game');
    }

    // --- Управление Нижней Панелью (ФИКС ВИДИМОСТИ) ---
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideOn = ['game', 'gameOver', 'modeSelection', 'pauseMenu'];
        if (hideOn.includes(roomName)) {
            bottomPanel.style.setProperty('display', 'none', 'important');
        } else {
            // Принудительно включаем видимость для главного меню и других комнат
            bottomPanel.style.setProperty('display', 'flex', 'important');
            bottomPanel.style.zIndex = "10001";
        }
    }

    // Управление игровыми движками
    if (roomName === 'game') {
        const activeEngine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
        if (activeEngine) {
            activeEngine.resize();
            activeEngine.isRunning = true;
            activeEngine.start(); 
        }
    } else if (roomName !== 'pauseMenu') {
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

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
    } catch (err) { console.error(`[RoomInit] Ошибка:`, err); }
}

window.showRoom = showRoom;

/**
 * Инициализация при загрузке
 */
async function init() {
    if (tg) {
        tg.ready();
        tg.expand(); 
    }

    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected ? "Connected" : "Disconnected");
        });
    } catch (e) { console.error("[TON] Ошибка кошелька:", e); }
    
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
        window.arcadeGame = new ArcadeGame(canvas, handleGameOver);
    }

    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { e.preventDefault(); showRoom(room); };
    };

    // Навигация
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
    if (btnCl) btnCl.onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };
    bindClick('btn-back-to-home', 'home');

    // Пауза
    const btnPause = document.getElementById('btn-pause-trigger');
    if (btnPause) {
        btnPause.onclick = () => {
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

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

    // --- ЭКРАН СМЕРТИ (GAME OVER) ---
    
    // 1. Кнопка возрождения (тратит СЕРДЕЧКО из инвентаря)
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = () => {
            if (state.powerups.heart > 0) {
                state.powerups.heart--; 
                updateGlobalUI();
                showRoom('game');
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                if (engine) engine.revive(); 
            }
        };
    }

    // 2. Кнопка PLAY AGAIN (Заново)
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
        btnRestart.onclick = () => showRoom('game');
    }

    // 3. Кнопка EXIT (В главное меню)
    const btnExitGameOver = document.getElementById('btn-exit-gameover');
    if (btnExitGameOver) {
        btnExitGameOver.onclick = () => showRoom('home');
    }

    // Авторизация
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        if (authData?.user) {
            Object.assign(state, {
                user: authData.user,
                coins: authData.user.coins ?? state.coins,
                lives: authData.user.lives ?? state.lives,
                crystals: authData.user.crystals ?? state.crystals
            });
            if (authData.user.powerups) state.powerups = { ...state.powerups, ...authData.user.powerups };
        }
    } catch (e) { console.error("[Auth] Ошибка:", e); }

    window.state = state; 
    updateGlobalUI();
    showRoom('home'); 
}

/**
 * Обработка окончания игры
 */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        // Показываем кнопку только если еще не возрождались И есть сердечки
        const hasHeart = state.powerups.heart > 0;
        btnRevive.style.display = (!reviveUsed && hasHeart) ? 'block' : 'none';
        btnRevive.innerText = `USE HEART ❤️ (Left: ${state.powerups.heart})`;
    }
    
    api.saveScore(score).catch(err => console.error("[Score] Ошибка:", err));
}

function updateGlobalUI() {
    if (!state) return;
    const coinValue = Number(state.coins).toLocaleString();
    const crystalValue = Number(state.crystals).toLocaleString();
    
    const setInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setInner('header-coins', coinValue);
    setInner('header-crystals', crystalValue);

    const coinEl = document.getElementById('coin-balance');
    if (coinEl) coinEl.innerHTML = `<span class="gold-coin">💰</span> ${coinValue}`;

    document.querySelectorAll('.stat-lives, #header-lives, #revive-lives-count').forEach(el => {
        el.innerText = state.lives;
    });

    document.querySelectorAll('.stat-crystals').forEach(el => {
        el.innerText = state.crystals;
    });

    if (state.powerups) {
        Object.keys(state.powerups).forEach(key => {
            const badge = document.querySelector(`.item-badge[data-powerup="${key}"]`);
            if (badge) badge.innerText = `x${state.powerups[key]}`;
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };