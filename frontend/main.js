/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * ПОЛНАЯ ВЕРСИЯ: Навигация, Интеграция и Изоляция Режимов
 */

import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js'; 
import { WalletManager } from './wallet.js';

// Импорт модулей комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   1. СОСТОЯНИЕ (STATE)
   --------------------------------------------------------- */
const state = { 
    user: null, 
    coins: 0, 
    lives: 3, 
    crystals: 0,
    currentMode: 'classic', // 'classic' или 'arcade'
    settings: { sound: true, music: true },
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 }
};

/* ---------------------------------------------------------
   2. СЛОВАРЬ СЦЕН (SCENES)
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
   3. НАВИГАЦИЯ (showRoom)
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Switch to: ${roomName}`);
    
    // 1. Скрываем абсолютно все экраны через цикл
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    // 2. Показываем нужный экран
    const target = scenes[roomName];
    if (target) target.classList.remove('hidden');

    // 3. Управление Хедером (Баланс монет/кристаллов)
    const header = document.getElementById('header');
    if (header) {
        const isGameUI = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = isGameUI ? 'none' : 'flex';
    }

    // 4. Кнопка Паузы (видна только внутри холста игры)
    const pauseBtn = document.getElementById('btn-pause-trigger');
    if (pauseBtn) pauseBtn.classList.toggle('hidden', roomName !== 'game');

    // 5. Нижняя панель навигации (Home, Shop, Friends)
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const shouldHide = ['game', 'gameOver', 'modeSelection', 'pauseMenu'].includes(roomName);
        bottomPanel.style.setProperty('display', shouldHide ? 'none' : 'flex', 'important');
    }

    // 6. ЗАПУСК ИГРОВЫХ ДВИЖКОВ
    if (roomName === 'game') {
        // Гасим активные циклы перед переключением
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;

        const isClassic = state.currentMode === 'classic';
        
        // Прячем UI способностей (щит и т.д.) если зашли в классику
        const arcadeUI = document.querySelector('.ingame-ui-left');
        if (arcadeUI) {
            arcadeUI.style.display = isClassic ? 'none' : 'flex';
        }

        // Выбираем движок
        const engine = isClassic ? window.game : window.arcadeGame;
        if (engine) {
            engine.resize();
            engine.start();
        }
    } else if (roomName !== 'pauseMenu') {
        // Если вышли в любое меню — стопаем всё
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // Инициализация контента комнат при заходе
    setTimeout(() => {
        try {
            if (roomName === 'shop') initShop();
            if (roomName === 'inventory') initInventory();
            if (roomName === 'friends') initFriends();
            if (roomName === 'daily') initDaily();
            if (roomName === 'leaderboard') initLeaderboard();
            if (roomName === 'settings') initSettings();
            
            updateGlobalUI(); 
        } catch (err) { 
            console.error(`[Init Error] ${roomName}:`, err); 
        }
    }, 10);
}

window.showRoom = showRoom;

/* ---------------------------------------------------------
   4. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ (init)
   --------------------------------------------------------- */
async function init() {
    if (tg) { tg.ready(); tg.expand(); }

    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        // Создаем два независимых класса
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }

    // Инициализация TON
    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet failed"); }

    // Универсальный биндер кликов для навигации
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
    bind('btn-top-icon', 'leaderboard');
    bind('btn-daily-icon', 'daily');
    bind('btn-start', 'modeSelection');
    bind('btn-home-panel', 'home');
    bind('btn-back-to-home', 'home');

    // Кнопки выбора режима
    document.getElementById('btn-mode-classic').onclick = () => {
        state.currentMode = 'classic';
        tg?.HapticFeedback.impactOccurred('medium');
        showRoom('game');
    };
    document.getElementById('btn-mode-arcade').onclick = () => {
        state.currentMode = 'arcade';
        tg?.HapticFeedback.impactOccurred('medium');
        showRoom('game');
    };

    // Управление паузой
    document.getElementById('btn-pause-trigger').onclick = (e) => {
        e.preventDefault();
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
        showRoom('pauseMenu');
    };

    document.getElementById('btn-resume').onclick = () => showRoom('game');
    document.getElementById('btn-exit-home').onclick = () => showRoom('home');

    // Кнопка ИСПОЛЬЗОВАНИЯ ЩИТА (ТОЛЬКО АРКАДА)
    const shieldBtn = document.getElementById('btn-use-shield');
    if (shieldBtn) {
        shieldBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (state.currentMode !== 'arcade') return; // Жесткий блок для классики

            if (state.powerups.shield > 0) {
                if (window.arcadeGame.activePowerups && !window.arcadeGame.activePowerups.shield) {
                    state.powerups.shield--;
                    window.arcadeGame.activePowerups.shield = 420; 
                    tg?.HapticFeedback.notificationOccurred('success');
                    updateGlobalUI();
                }
            }
        };
    }

    // Кнопка ВОЗРОЖДЕНИЯ (Heart)
    document.getElementById('btn-revive').onclick = () => {
        if (state.powerups.heart > 0) {
            state.powerups.heart--;
            updateGlobalUI();
            const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
            engine.revive();
            showRoom('game');
        }
    };

    document.getElementById('btn-restart').onclick = () => showRoom('game');
    document.getElementById('btn-exit-gameover').onclick = () => showRoom('home');

    // Подгрузка данных из API
    try {
        const data = await api.authPlayer(tg?.initDataUnsafe?.start_param || "");
        if (data?.user) {
            state.coins = data.user.coins ?? state.coins;
            state.lives = data.user.lives ?? state.lives;
            state.crystals = data.user.crystals ?? state.crystals;
            if (data.user.powerups) state.powerups = { ...state.powerups, ...data.user.powerups };
        }
    } catch (e) { console.error("API Auth Error", e); }

    window.state = state;
    updateGlobalUI();
    showRoom('home');
}

/* ---------------------------------------------------------
   5. GAME OVER & UI SYNC
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScore = document.getElementById('final-score');
    if (finalScore) finalScore.innerText = score;
    
    const revBtn = document.getElementById('btn-revive');
    if (revBtn) {
        const canRevive = !reviveUsed && state.powerups.heart > 0;
        revBtn.classList.toggle('hidden', !canRevive);
        revBtn.innerHTML = `USE HEART ❤️ <br><small>(${state.powerups.heart} LEFT)</small>`;
    }
    api.saveScore(score);
}

function updateGlobalUI() {
    if (!state) return;

    // Баланс
    const coinEl = document.getElementById('header-coins');
    if (coinEl) coinEl.innerText = Number(state.coins).toLocaleString();
    
    const cryEl = document.getElementById('header-crystals');
    if (cryEl) cryEl.innerText = state.crystals;

    // Жизни
    document.querySelectorAll('.stat-lives, #header-lives').forEach(el => {
        el.innerText = state.lives;
    });

    // Бейджи способностей (data-powerup="shield" и т.д.)
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val;
            // Скрываем бейдж если 0, но оставляем счетчик щита в игре
            if (el.id !== 'shield-count') {
                el.classList.toggle('hidden', val <= 0);
            }
        });
    });

    // Отрисовка кнопки щита
    const sBtn = document.getElementById('btn-use-shield');
    if (sBtn) {
        const hasShields = state.powerups.shield > 0;
        const isArcade = state.currentMode === 'arcade';
        sBtn.style.opacity = (hasShields && isArcade) ? "1" : "0.5";
        sBtn.style.pointerEvents = isArcade ? "auto" : "none";
    }
}

window.updateGlobalUI = updateGlobalUI;

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };