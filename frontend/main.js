/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Версия: 1.4 (Исправленная и чистая)
 */

import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js';
import { CareerGame } from './career.js'; // Импорт карьеры
import { WalletManager } from './wallet.js';

import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';
import { initCareerMap } from './js/rooms/career_map.js';

const tg = window.Telegram?.WebApp;

/* --- STATE --- */
const state = { 
    user: null,
    coins: 0,
    lives: 5, 
    crystals: 0,
    inventory: [],
    currentMode: 'classic',
    settings: { sound: true, music: true },
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 }
};

/* --- DOM CACHE --- */
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
    pauseMenu: document.getElementById('pause-menu'),
    careerMap: document.getElementById('scene-career-map')
};

/* --- SAVE --- */
async function saveData() {
    localStorage.setItem('game_state', JSON.stringify({
        coins: state.coins,
        inventory: state.inventory,
        powerups: state.powerups
    }));
    try {
        if (api.syncState) await api.syncState(state);
    } catch (e) {
        console.warn("Save Error:", e);
    }
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

/* --- NAVIGATION --- */
function showRoom(roomName) {
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    const target = scenes[roomName];
    if (!target) return console.error(`Сцена "${roomName}" не найдена!`);
    target.classList.remove('hidden');

    // Header
    const header = document.getElementById('header');
    if (header) header.style.display = 'flex';

    // Pause Btn
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.classList.toggle('hidden', roomName !== 'game');

    // Bottom Menu
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu', 'careerMap'].includes(roomName);
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    // Game Start Logic
    if (roomName === 'game') {
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
        
        const isClassic = state.currentMode === 'classic';
        const isCareer = state.currentMode === 'career';

        const arcadeUI = document.querySelector('.ingame-ui-left') || document.getElementById('ingame-inventory');
        if (arcadeUI) {
            arcadeUI.style.display = (state.currentMode === 'arcade') ? 'flex' : 'none';
            if (state.currentMode === 'arcade') updatePowerupsPanel();
        }

        let engine = null;
        if (isClassic) engine = window.game;
        else if (isCareer) engine = window.careerGame;
        else engine = window.arcadeGame;

        if (engine) {
            engine.resize();
            if (!isCareer) engine.start();
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
                case 'careerMap': initCareerMap(); break;
            }
            updateGlobalUI(); 
        } catch (e) { console.error(`Error room ${roomName}:`, e); }
    }, 10);
}
window.showRoom = showRoom;

/* --- INIT --- */
async function init() {
    if (tg) { tg.ready(); tg.expand(); }
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
        window.careerGame = new CareerGame(canvas, (lvl) => handleCareerWin(lvl), () => handleCareerLose());
    }
    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet skip"); }

    window.addEventListener('buy_item', async (e) => {
        const { id, price, type, powerupType } = e.detail;
        if (state.coins >= price) {
            state.coins -= price;
            if (type === 'powerup') state.powerups[powerupType] = (state.powerups[powerupType] || 0) + 1;
            else if (!state.inventory.includes(id)) state.inventory.push(id);
            tg?.HapticFeedback.notificationOccurred('success');
            updateGlobalUI();
            await saveData();
        } else {
            tg?.HapticFeedback.notificationOccurred('error');
        }
    });

    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { e.preventDefault(); tg?.HapticFeedback.impactOccurred('light'); showRoom(room); };
    };
    bind('btn-shop', 'shop');
    bind('btn-inventory', 'inventory');
    bind('btn-friends', 'friends');
    bind('btn-settings', 'settings');
    bind('btn-home-panel', 'home');
    bind('btn-back-to-home', 'home');
    bind('btn-start', 'modeSelection');
    bind('top-btn', 'leaderboard');
    bind('daily-btn', 'daily');

    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };
    
    const btnCareer = document.getElementById('btn-mode-career');
    if (btnCareer) {
        btnCareer.onclick = () => {
            state.currentMode = 'career';
            showRoom('careerMap');
        };
    }
    const btnBackCareer = document.getElementById('btn-back-from-career');
    if (btnBackCareer) btnBackCareer.onclick = () => showRoom('modeSelection');

    const pauseTrigger = document.getElementById('pause-btn');
    if (pauseTrigger) {
        pauseTrigger.onclick = (e) => {
            e.preventDefault();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            if (window.careerGame) window.careerGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    const resBtn = document.getElementById('btn-resume');
    if (resBtn) resBtn.onclick = () => {
        document.getElementById('pause-menu').classList.add('hidden');
        if (state.currentMode === 'classic' && window.game) {
            window.game.isRunning = true; window.game.loop();
        } else if (state.currentMode === 'arcade' && window.arcadeGame) {
            window.arcadeGame.isRunning = true; window.arcadeGame.loop();
        } else if (state.currentMode === 'career' && window.careerGame) {
            window.careerGame.isRunning = true; window.careerGame.loop();
        }
    };
    
    const exitBtn = document.getElementById('btn-exit-home');
    if (exitBtn) exitBtn.onclick = () => showRoom('home');
    
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
    
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.onclick = () => {
        if(state.currentMode === 'career') showRoom('careerMap');
        else showRoom('game');
    };
    const exitGO = document.getElementById('btn-exit-gameover');
    if (exitGO) exitGO.onclick = () => showRoom('home');

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
    } catch (e) { console.error("Login Error:", e); }

    window.state = state;
    updateGlobalUI();
    showRoom('home'); 
}

/* --- GAME OVER --- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    
    const btnRev = document.getElementById('btn-revive');
    const revCount = document.getElementById('revive-count'); 
    
    if (btnRev) {
        const canRev = state.currentMode !== 'career' && !reviveUsed && state.powerups.heart > 0;
        const heartsLeft = state.powerups.heart || 0;
        if (revCount) revCount.innerText = `(${heartsLeft})`;

        if (canRev) {
            btnRev.disabled = false;
            btnRev.style.opacity = "1";
            btnRev.style.filter = "none";
            btnRev.style.cursor = "pointer";
        } else {
            btnRev.disabled = true;
            btnRev.style.opacity = "0.5";
            btnRev.style.filter = "grayscale(1)";
            btnRev.style.cursor = "not-allowed";
        }
    }
    saveData();
    if(state.currentMode !== 'career') api.saveScore(score).catch(e => console.log("Score not saved:", e));
}

// Победа в карьере
async function handleCareerWin(levelId) {
    tg?.showAlert("🏆 УРОВЕНЬ ПРОЙДЕН!");
    try {
        const res = await api.apiRequest('career', 'POST', { action: 'complete_level', level: levelId });
        if (res && res.success) {
            if (res.newMaxLevel) state.user.max_level = res.newMaxLevel;
            state.coins += res.reward || 0;
            updateGlobalUI();
        }
    } catch (e) { console.error(e); }
    showRoom('careerMap');
}

// Поражение в карьере
function handleCareerLose() {
    tg?.showAlert("💀 ТЫ ПРОИГРАЛ!");
    showRoom('careerMap');
}

/* --- UI UPDATE --- */
function updateGlobalUI() {
    if (!state) return;
    const enEl = document.getElementById('header-energy');
    if (enEl) enEl.innerText = state.lives;
    const cEl = document.getElementById('header-coins');
    if (cEl) cEl.innerText = Number(state.coins).toLocaleString();
    const crEl = document.getElementById('header-crystals');
    if (crEl) crEl.innerText = state.crystals;

    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => el.innerText = val > 3 ? "3+" : val);
    });

    if (scenes.game && !scenes.game.classList.contains('hidden')) updatePowerupsPanel();
}
window.updateGlobalUI = updateGlobalUI;

function updatePowerupsPanel() {
    const abilities = ['shield', 'gap', 'ghost', 'magnet'];
    abilities.forEach(id => {
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
                e.preventDefault(); e.stopPropagation();
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
