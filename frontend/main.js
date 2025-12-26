import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

// Импорты логики комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;

const state = { 
    user: null, 
    coins: 0, 
    lives: 5, 
    crystals: 1,
    powerups: { shield: 0, gap: 0, magnet: 0, ghost: 0 }
};

const scenes = {
    home: document.getElementById('scene-home'),
    game: document.getElementById('game-container'),
    shop: document.getElementById('scene-shop'),
    leaderboard: document.getElementById('scene-leaderboard'),
    friends: document.getElementById('scene-friends'),
    inventory: document.getElementById('scene-inventory'),
    daily: document.getElementById('scene-daily'),
    settings: document.getElementById('scene-settings'),
    gameOver: document.getElementById('game-over')
};

function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // 1. Скрываем все экраны
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    // 2. Показываем целевой
    const target = scenes[roomName];
    if (target) target.classList.remove('hidden');

    // 3. Управление Header (Баланс) - показываем ВЕЗДЕ кроме самой игры
    const header = document.getElementById('header');
    if (header) {
        header.style.display = (roomName === 'game') ? 'none' : 'flex';
    }

    // 4. Управление нижней панелью кнопок
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        // Панель видна везде, кроме активного процесса игры и экрана Game Over
        const hidePanel = ['game', 'gameOver'].includes(roomName);
        bottomPanel.style.display = hidePanel ? 'none' : 'flex';
        // Форсируем pointer-events, чтобы кнопки всегда нажимались
        bottomPanel.style.pointerEvents = 'auto';
    }

    // 5. Безопасная инициализация TON Connect
    if (window.wallet && window.wallet.tonConnectUI) {
        let container = null;
        if (roomName === 'shop') container = '#shop-ton-wallet';
        if (roomName === 'settings') container = '#settings-ton-wallet';

        if (container && document.querySelector(container)) {
            try {
                window.wallet.tonConnectUI.setConnectButtonRoot(container);
            } catch (e) {
                console.warn("[TON] Ошибка смены корня:", e);
            }
        }
    }

    // 6. Управление состоянием игры
    if (window.game) {
        if (roomName === 'game') {
            window.game.resize();
            window.game.start();
        } else {
            window.game.isRunning = false; 
        }
    }

    // 7. Инициализация логики комнат
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
    } catch (err) {
        console.error(`[RoomInit] Ошибка в ${roomName}:`, err);
    }
}

window.showRoom = showRoom;

async function init() {
    console.log("[App] Инициализация...");
    if (tg) {
        tg.ready();
        tg.expand(); 
        try {
            tg.setHeaderColor('#4ec0ca');
            tg.setBackgroundColor('#4ec0ca');
        } catch(e) {}
    }

    // Инициализация кошелька
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected ? "Connected" : "Disconnected");
        });
    } catch (e) { console.error("[TON] Ошибка:", e); }
    
    // Инициализация игры
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // Привязка кликов (с проверкой на существование)
    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = (e) => { 
                e.preventDefault();
                console.log(`[Click] Кнопка ${id} -> ${room}`);
                showRoom(room); 
            };
        } else {
            console.warn(`[Init] Кнопка с id "${id}" не найдена в HTML`);
        }
    };

    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-start', 'game');
    bindClick('btn-top-icon', 'leaderboard');
    bindClick('btn-daily-icon', 'daily');

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('home');

    // Авторизация
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        if (authData?.user) {
            Object.assign(state, {
                user: authData.user,
                coins: authData.user.coins ?? state.coins,
                lives: authData.user.lives ?? state.lives,
                crystals: authData.user.crystals ?? state.crystals,
                powerups: authData.user.powerups ? { ...state.powerups, ...authData.user.powerups } : state.powerups
            });
        }
    } catch (e) {
        console.error("[Auth] Ошибка API:", e);
    }

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
    
    // Обновляем монеты
    const headerCoins = document.getElementById('header-coins');
    if (headerCoins) headerCoins.innerText = coinValue;

    // Обновляем кристаллы
    const headerCrystals = document.getElementById('header-crystals');
    if (headerCrystals) headerCrystals.innerText = crystalValue;

    // Обновляем жизни
    document.querySelectorAll('.stat-lives, #header-lives, #revive-lives-count').forEach(el => {
        el.innerText = state.lives;
    });

    // Обновляем бейджи предметов
    if (state.powerups) {
        Object.keys(state.powerups).forEach(key => {
            const badge = document.querySelector(`.item-badge[data-powerup="${key}"]`);
            if (badge) badge.innerText = `x${state.powerups[key]}`;
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