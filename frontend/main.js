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

// 1. Глобальное состояние приложения
const state = { 
    user: null, 
    coins: 0, 
    lives: 5, 
    crystals: 1,
    powerups: {
        shield: 0,
        gap: 0,
        magnet: 0,
        ghost: 0
    }
};

// Ссылки на экраны
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

    // --- УПРАВЛЕНИЕ ОТОБРАЖЕНИЕМ БАЛАНСА (HEADER) ---
    const header = document.getElementById('header');
    if (header) {
        header.style.display = (roomName === 'game') ? 'none' : 'flex';
    }

    // --- УПРАВЛЕНИЕ НИЖНЕЙ ПАНЕЛЬЮ (ИСПРАВЛЕНО) ---
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        // Прячем в игре и на экране проигрыша
        const isGameMode = (roomName === 'game' || roomName === 'gameOver');
        
        if (isGameMode) {
            bottomPanel.classList.add('hidden'); // Добавляем класс для CSS
            bottomPanel.style.display = 'none';   // Дублируем для надежности
        } else {
            bottomPanel.classList.remove('hidden');
            bottomPanel.style.display = 'flex';
        }
    }

    // Безопасная инициализация TON Connect
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

    // Управление состоянием игры
    if (window.game) {
        if (roomName === 'game') {
            window.game.resize();
            window.game.start();
        } else {
            window.game.isRunning = false; 
        }
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
        try {
            tg.setHeaderColor('#4ec0ca');
            tg.setBackgroundColor('#4ec0ca');
        } catch(e) {}
    }

    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected ? "Connected" : "Disconnected");
        });
    } catch (e) { 
        console.error("[TON] Ошибка инициализации кошелька:", e); 
    }
    
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { 
            e.preventDefault(); 
            showRoom(room); 
        };
    };

    // Привязка всех кнопок
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

    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = async () => {
            if (state.lives > 0) {
                state.lives--;
                updateGlobalUI();
                showRoom('game');
                window.game?.revive();
            } else {
                if(tg) tg.showAlert("У вас нет сердечек ❤️");
                else alert("У вас нет сердечек ❤️");
            }
        };
    }

    // Авторизация
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
    } catch (e) {
        console.error("[Auth] Ошибка API, используем локальный state:", e);
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
    
    api.saveScore(score).catch(err => console.error("[Score] Ошибка сохранения:", err));
}

function updateGlobalUI() {
    if (!state) return;
    const coinValue = Number(state.coins).toLocaleString();
    const crystalValue = Number(state.crystals).toLocaleString();
    
    const headerCoins = document.getElementById('header-coins');
    if (headerCoins) headerCoins.innerText = coinValue;

    const coinEl = document.getElementById('coin-balance');
    if (coinEl) {
        coinEl.innerHTML = `<span class="gold-coin">💰</span> ${coinValue}`;
    }

    document.querySelectorAll('.stat-lives, #header-lives, #revive-lives-count').forEach(el => {
        el.innerText = state.lives;
    });

    const headerCrystals = document.getElementById('header-crystals');
    if (headerCrystals) headerCrystals.innerText = crystalValue;

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

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };