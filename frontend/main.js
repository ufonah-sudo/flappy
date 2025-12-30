/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Исправлено: Полное раскрытие на весь экран без зазоров.
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
   3. КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ
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
   4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (FIX HEIGHT & NAVIGATION)
   --------------------------------------------------------- */

// ФУНКЦИЯ ФИКСА ВЫСОТЫ (Убирает зазоры в Telegram)
function fixViewportHeight() {
    const vh = window.innerHeight;
    document.documentElement.style.height = `${vh}px`;
    document.body.style.height = `${vh}px`;
    window.scrollTo(0, 0);
    
    // Обновляем размеры канваса, если игра создана
    if (window.game) window.game.resize();
    if (window.arcadeGame) window.arcadeGame.resize();
}

async function saveData() {
    localStorage.setItem('game_state', JSON.stringify({
        coins: state.coins,
        inventory: state.inventory,
        powerups: state.powerups
    }));
    try {
        if (api.syncState) await api.syncState(state);
    } catch (e) { console.warn("Sync error:", e); }
}
window.saveData = saveData;

async function activateAbility(id) {
    const realCount = state.powerups[id] || 0;
    if (state.currentMode === 'arcade' && realCount > 0) {
        if (window.arcadeGame && window.arcadeGame.activePowerups && window.arcadeGame.activePowerups[id] <= 0) {
            state.powerups[id]--;
            window.arcadeGame.activatePowerupEffect(id);
            updatePowerupsPanel();
            updateGlobalUI();
            saveData();
            tg?.HapticFeedback.notificationOccurred('success');
        }
    } else if (realCount === 0) {
        tg?.HapticFeedback.notificationOccurred('error');
    }
}
window.activateAbility = activateAbility;

function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    const target = scenes[roomName];
    if (target) target.classList.remove('hidden');

    const header = document.getElementById('header');
    if (header) {
        const isGameUI = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = isGameUI ? 'none' : 'flex';
    }

    const pauseBtn = document.getElementById('btn-pause-trigger');
    if (pauseBtn) pauseBtn.classList.toggle('hidden', roomName !== 'game');

    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu'].includes(roomName);
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    if (roomName === 'game') {
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;

        const isClassic = state.currentMode === 'classic';
        const arcadeUI = document.getElementById('ingame-inventory');
        if (arcadeUI) {
            arcadeUI.style.display = isClassic ? 'none' : 'flex';
            if (!isClassic) updatePowerupsPanel();
        }

        const engine = isClassic ? window.game : window.arcadeGame;
        if (engine) {
            engine.resize(); 
            engine.start(); 
        }
    }

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
        } catch (e) { console.error(`Room error ${roomName}:`, e); }
    }, 10);
}
window.showRoom = showRoom;

/* ---------------------------------------------------------
   5. ИНИЦИАЛИЗАЦИЯ (INIT)
   --------------------------------------------------------- */
async function init() {
    // 1. Настройка Telegram WebApp
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#4ec0ca');
        tg.setBackgroundColor('#4ec0ca');
    }

    // 2. Исправление зазоров (несколько раз для надежности)
    fixViewportHeight();
    [100, 300, 600, 1000].forEach(delay => setTimeout(fixViewportHeight, delay));
    window.addEventListener('resize', fixViewportHeight);

    // 3. Создание игровых движков
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }

    // 4. Кошелек
    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet skip"); }

    // 5. Покупки
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
        } else {
            tg?.HapticFeedback.notificationOccurred('error');
            alert("Not enough coins!");
        }
    });

    // 6. Биндинг кнопок
    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            e.preventDefault();
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
    bind('btn-top-icon', 'leaderboard');
    bind('daily-btn', 'daily');
    bind('btn-daily-icon', 'daily');

    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };

    const pauseTrigger = document.getElementById('pause-btn');
    if (pauseTrigger) {
        pauseTrigger.onclick = (e) => {
            e.preventDefault();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    document.getElementById('btn-resume')?.addEventListener('click', () => showRoom('game'));
    document.getElementById('btn-exit-home')?.addEventListener('click', () => showRoom('home'));
    document.getElementById('btn-restart')?.addEventListener('click', () => showRoom('game'));
    document.getElementById('btn-exit-gameover')?.addEventListener('click', () => showRoom('home'));

    const reviveBtn = document.getElementById('btn-revive');
    if (reviveBtn) {
        reviveBtn.onclick = (e) => {
            e.preventDefault();
            if (state.powerups.heart > 0) {
                state.powerups.heart--;
                updateGlobalUI();
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                engine.revive();
                showRoom('game');
                saveData();
            }
        };
    }

    // 7. Загрузка данных
    try {
        const auth = await api.authPlayer(tg?.initDataUnsafe?.start_param || "");
        if (auth?.user) {
            state.user = auth.user;
            state.coins = auth.user.coins ?? state.coins;
            state.lives = auth.user.lives ?? state.lives;
            state.crystals = auth.user.crystals ?? state.crystals;
            state.inventory = auth.user.inventory ?? [];
            if (auth.user.powerups) state.powerups = { ...state.powerups, ...auth.user.powerups };
        }
    } catch (e) { console.error("Load error:", e); }

    window.state = state;
    updateGlobalUI();
    showRoom('home'); 
}

/* ---------------------------------------------------------
   6. ИГРОВАЯ ЛОГИКА И UI
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    
    const btnRev = document.getElementById('btn-revive');
    if (btnRev) {
        const canRev = !reviveUsed && state.powerups.heart > 0;
        btnRev.classList.toggle('hidden', !canRev);
        btnRev.innerHTML = `USE HEART ❤️ <br><small>(${state.powerups.heart} LEFT)</small>`;
    }
    saveData();
    api.saveScore(score).catch(e => console.log("Score not saved:", e));
}

function updateGlobalUI() {
    if (!state) return;
    document.getElementById('header-coins').innerText = Number(state.coins).toLocaleString();
    document.getElementById('header-crystals').innerText = state.crystals;
    document.querySelectorAll('.stat-lives, #header-lives').forEach(el => el.innerText = state.lives);

    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => el.innerText = val > 3 ? "3+" : val);
    });

    if (scenes.game && !scenes.game.classList.contains('hidden')) updatePowerupsPanel();
}
window.updateGlobalUI = updateGlobalUI;

function updatePowerupsPanel() {
    ['shield', 'gap', 'ghost', 'magnet'].forEach(id => {
        const slots = document.querySelectorAll(`[data-ability="${id}"]`);
        const realCount = state.powerups[id] || 0;

        slots.forEach(slot => {
            const countSpan = slot.querySelector('.count') || slot.querySelector('.badge');
            if (countSpan) countSpan.innerText = realCount > 3 ? "3+" : realCount;
            
            if (realCount <= 0) {
                slot.style.opacity = "0.3";
                slot.style.filter = "grayscale(1)";
                slot.style.pointerEvents = "none";
            } else {
                slot.style.opacity = "1";
                slot.style.filter = "grayscale(0)";
                slot.style.pointerEvents = "auto";
            }
            slot.onclick = (e) => {
                e.preventDefault();
                activateAbility(id);
            };
        });
    });
}
window.updatePowerupsPanel = updatePowerupsPanel;

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };