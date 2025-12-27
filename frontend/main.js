/* ==========================================================================
    ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
    Управляет навигацией, инициализацией движков и синхронизацией с Telegram
   ========================================================================== */

import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js'; 
import { WalletManager } from './wallet.js';

// Импорты инициализации логики для каждой комнаты
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
    1. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   --------------------------------------------------------- */
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
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все сцены перед показом нужной
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (!target) return;
    target.classList.remove('hidden');

    // Управление Хедером
    const header = document.getElementById('header');
    if (header) {
        header.style.display = (['game', 'pauseMenu', 'gameOver'].includes(roomName)) ? 'none' : 'flex';
    }

    // Кнопка Паузы
    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        pauseTrigger.classList.toggle('hidden', roomName !== 'game');
    }

    // Нижнее меню (учитываем все условия скрытия)
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideOn = ['game', 'gameOver', 'modeSelection', 'pauseMenu'];
        if (hideOn.includes(roomName)) {
            bottomPanel.style.setProperty('display', 'none', 'important');
        } else {
            bottomPanel.style.setProperty('display', 'flex', 'important');
        }
    }

    // ЛОГИКА ЗАПУСКА ИГРЫ
    if (roomName === 'game') {
        const activeEngine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
        if (activeEngine) {
            // Передаем актуальное количество предметов
            activeEngine.inventory = { ...state.powerups }; 
            // Инициализируем объект активных бонусов, чтобы не было undefined
            activeEngine.activePowerups = activeEngine.activePowerups || {};
            
            activeEngine.resize();
            activeEngine.isRunning = true;
            activeEngine.start(); 
        }
        
        // Показываем кнопки способностей только в Аркаде
        const ingamePowerups = document.querySelector('.ingame-ui-left');
        if (ingamePowerups) {
            ingamePowerups.classList.toggle('hidden', state.currentMode === 'classic');
        }
    } else if (roomName !== 'pauseMenu') {
        // Останавливаем движки при выходе в меню
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // Подсветка выбранного режима
    if (roomName === 'modeSelection') {
        document.getElementById('btn-mode-classic')?.classList.toggle('active', state.currentMode === 'classic');
        document.getElementById('btn-mode-arcade')?.classList.toggle('active', state.currentMode === 'arcade');
    }

    // Инициализация специфической логики комнаты
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

/* ---------------------------------------------------------
    4. ИНИЦИАЛИЗАЦИЯ (init)
   --------------------------------------------------------- */
async function init() {
    if (tg) {
        tg.ready();
        tg.expand(); 
    }

    // TON Кошелек
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected);
        });
    } catch (e) { console.error("[TON] Ошибка:", e); }
    
    // Движки
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
        window.arcadeGame = new ArcadeGame(canvas, handleGameOver);
    }

    // Хелпер кликов с защитой от проваливания (stopPropagation)
    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { 
            e.preventDefault();
            e.stopPropagation();
            tg?.HapticFeedback.impactOccurred('light');
            showRoom(room); 
        };
    };

    /* Привязка кнопок */
    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-top-icon', 'leaderboard');
    bindClick('btn-daily-icon', 'daily');    
    bindClick('btn-start', 'modeSelection');
    bindClick('btn-back-to-home', 'home');

    // Выбор режима
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = (e) => { 
        e.stopPropagation();
        tg?.HapticFeedback.impactOccurred('medium');
        state.currentMode = 'classic'; 
        showRoom('game'); 
    };

    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = (e) => { 
        e.stopPropagation();
        tg?.HapticFeedback.impactOccurred('medium');
        state.currentMode = 'arcade'; 
        showRoom('game'); 
    };

    // Пауза
    const btnPause = document.getElementById('btn-pause-trigger');
    if (btnPause) {
        btnPause.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            tg?.HapticFeedback.selectionChanged();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.onclick = (e) => {
        e.stopPropagation();
        tg?.HapticFeedback.impactOccurred('light');
        showRoom('game');
    }

    // Использование Щита в Аркаде
    const btnShieldInGame = document.getElementById('btn-use-shield');
    if (btnShieldInGame) {
        btnShieldInGame.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            if (state.powerups.shield > 0 && state.currentMode === 'arcade') {
                if (!window.arcadeGame.activePowerups?.shield) {
                    state.powerups.shield--;
                    window.arcadeGame.activePowerups.shield = 400; 
                    tg?.HapticFeedback.notificationOccurred('success');
                    updateGlobalUI();
                }
            }
        };
    }

    // Game Over логика
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = (e) => {
            e.stopPropagation();
            if (state.powerups.heart > 0) {
                tg?.HapticFeedback.notificationOccurred('success');
                state.powerups.heart--; 
                updateGlobalUI();
                showRoom('game');
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                if (engine) engine.revive(); 
            }
        };
    }

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
        btnRestart.onclick = (e) => {
            e.stopPropagation();
            tg?.HapticFeedback.impactOccurred('medium');
            showRoom('game');
        }
    }

    // Загрузка данных
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
    } catch (e) { console.error("[Auth] Ошибка, работаем локально."); }

    window.state = state; 
    updateGlobalUI();
    showRoom('home'); 
}

/* ---------------------------------------------------------
    5. ОБРАБОТКА СМЕРТИ
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.classList.toggle('hidden', reviveUsed || state.powerups.heart <= 0);
        btnRevive.innerHTML = `USE HEART ❤️ <br><small>(Available: ${state.powerups.heart})</small>`;
    }
    api.saveScore(score).catch(err => console.error("[Score] Ошибка сохранения:", err));
}

/* ---------------------------------------------------------
    6. СИНХРОНИЗАЦИЯ UI
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    const setInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setInner('header-coins', Number(state.coins).toLocaleString());
    setInner('header-crystals', Number(state.crystals).toLocaleString());

    document.querySelectorAll('.stat-lives, #header-lives, #revive-lives-count').forEach(el => {
        el.innerText = state.lives;
    });

    if (state.powerups) {
        Object.keys(state.powerups).forEach(key => {
            // Находим все баджи (и в магазине, и в игровом инвентаре)
            const badges = document.querySelectorAll(`.item-badge[data-powerup="${key}"], .powerup-count-${key}, .badge[data-powerup="${key}"]`);
            badges.forEach(badge => {
                badge.innerText = state.powerups[key];
                badge.classList.toggle('hidden', state.powerups[key] <= 0);
            });
        });
    }
}

/* ---------------------------------------------------------
    7. ТОЧКА ВХОДА
   --------------------------------------------------------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };