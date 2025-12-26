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
    currentMode: 'classic', // Отслеживаем режим: classic или arcade
    powerups: {
        shield: 0,
        gap: 0,
        magnet: 0,
        ghost: 0
    }
};

// Ссылки на экраны (Добавлена modeSelection)
const scenes = {
    home: document.getElementById('scene-home'),
    modeSelection: document.getElementById('scene-mode-selection'), // Новый экран
    game: document.getElementById('game-container'),
    shop: document.getElementById('scene-shop'),
    leaderboard: document.getElementById('scene-leaderboard'),
    friends: document.getElementById('scene-friends'),
    inventory: document.getElementById('scene-inventory'),
    daily: document.getElementById('scene-daily'),
    settings: document.getElementById('scene-settings'),
    gameOver: document.getElementById('game-over')
};

/**
 * Основная функция навигации
 */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все экраны
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (!target) return;
    target.classList.remove('hidden');

    // --- УПРАВЛЕНИЕ HEADER (БАЛАНСЫ) ---
    const header = document.getElementById('header');
    if (header) {
        // Прячем баланс только в самой игре
        header.style.display = (roomName === 'game') ? 'none' : 'flex';
    }

    // --- УПРАВЛЕНИЕ НИЖНЕЙ ПАНЕЛЬЮ ---
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        // Прячем панель в игре, на экране смерти И при выборе режима
        const hideOn = ['game', 'gameOver', 'modeSelection'];
        if (hideOn.includes(roomName)) {
            bottomPanel.classList.add('hidden');
            bottomPanel.style.display = 'none';
        } else {
            bottomPanel.classList.remove('hidden');
            bottomPanel.style.display = 'flex'; 
        }
    }

    // Управление TON Connect
    if (window.wallet && window.wallet.tonConnectUI) {
        let walletContainerSelector = null;
        if (roomName === 'shop') walletContainerSelector = '#shop-ton-wallet';
        if (roomName === 'settings') walletContainerSelector = '#settings-ton-wallet';

        if (walletContainerSelector && document.querySelector(walletContainerSelector)) {
            try {
                window.wallet.tonConnectUI.setConnectButtonRoot(walletContainerSelector);
            } catch (e) {
                console.warn("[TON] Ошибка смены корня кнопки:", e);
            }
        }
    }

    // Управление игровыми движками
    if (roomName === 'game') {
        if (state.currentMode === 'classic' && window.game) {
            window.game.resize();
            window.game.start();
        } else if (state.currentMode === 'arcade' && window.arcadeGame) {
            window.arcadeGame.resize();
            window.arcadeGame.start();
        }
    } else {
        // Останавливаем оба движка, если мы не в игре
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
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
    } catch (err) {
        console.error(`[RoomInit] Ошибка в ${roomName}:`, err);
    }
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

    // Инициализация кошелька
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected ? "Connected" : "Disconnected");
        });
    } catch (e) { console.error("[TON] Ошибка:", e); }
    
    // Инициализация холстов (Canvas)
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
        window.arcadeGame = new ArcadeGame(canvas, handleGameOver); // Инициализируем Аркаду
    }

    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { 
            e.preventDefault(); 
            showRoom(room); 
        };
    };

    // Привязка кнопок меню
    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-top-icon', 'leaderboard');
    bindClick('btn-daily-icon', 'daily');

    // Кнопка PLAY на главном экране теперь ведет в ВЫБОР РЕЖИМА
    bindClick('btn-start', 'modeSelection');

    // Кнопки ВЫБОРА РЕЖИМА
    const btnClassic = document.getElementById('btn-mode-classic');
    if (btnClassic) btnClassic.onclick = () => {
        state.currentMode = 'classic';
        showRoom('game');
    };

    const btnArcade = document.getElementById('btn-mode-arcade');
    if (btnArcade) btnArcade.onclick = () => {
        state.currentMode = 'arcade';
        showRoom('game');
    };

    const btnBack = document.getElementById('btn-back-to-home');
    if (btnBack) btnBack.onclick = () => showRoom('home');

    // Остальные кнопки
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('home');

    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = async () => {
            if (state.lives > 0) {
                state.lives--;
                updateGlobalUI();
                showRoom('game');
                // Оживляем тот движок, который сейчас активен
                if (state.currentMode === 'classic') window.game?.revive();
                else window.arcadeGame?.revive();
            } else {
                tg?.showAlert("У вас нет сердечек ❤️");
            }
        };
    }

    // Загрузка данных
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        if (authData?.user) {
            state.user = authData.user;
            state.coins = authData.user.coins ?? state.coins;
            state.lives = authData.user.lives ?? state.lives;
            state.crystals = authData.user.crystals ?? state.crystals;
            if (authData.user.powerups) {
                state.powerups = { ...state.powerups, ...authData.user.powerups };
            }
        }
    } catch (e) { console.error("[Auth] Ошибка API:", e); }

    window.state = state; 
    updateGlobalUI();
    showRoom('home'); 
}

function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.style.display = (!reviveUsed && state.lives > 0) ? 'block' : 'none';
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