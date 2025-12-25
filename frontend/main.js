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

// 1. Глобальное состояние приложения (Добавлены жизни и кристаллы)
const state = { 
    user: null, 
    coins: 100, 
    lives: 5, // Это наше "Сердечко"
    crystals: 1,
    // Новые способности
    powerups: {
        shield: 0,
        gap: 0,
        magnet: 0,
        ghost: 0
    }
};

// Ссылки на экраны (Scenes)
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
    if (!target) {
        console.error(`[Navigation] Экран ${roomName} не найден!`);
        return;
    }

    target.classList.remove('hidden');

    // Логика для TON Connect
    if (window.wallet && window.wallet.tonConnectUI) {
        let walletContainerSelector = null;
        if (roomName === 'shop') walletContainerSelector = '#shop-ton-wallet';
        if (roomName === 'settings') walletContainerSelector = '#settings-ton-wallet';

        if (walletContainerSelector && document.querySelector(walletContainerSelector)) {
            window.wallet.tonConnectUI.setConnectButtonRoot(walletContainerSelector);
        }
    }

    // Управление состоянием игры
    if (window.game) {
        if (roomName === 'game') {
            window.game.resize();
            window.game.start(); // Вход всегда бесплатный
        } else {
            window.game.isRunning = false;
        }
    }

    // Инициализация специфической логики комнаты
    try {
        switch(roomName) {
            case 'shop':        initShop(); break;
            case 'inventory':   initInventory(); break;
            case 'friends':     initFriends(); break;
            case 'daily':       initDaily(); break;
            case 'leaderboard': initLeaderboard(); break;
            case 'settings':    initSettings(); break;
            case 'home':        updateGlobalUI(); break;
        }
    } catch (err) {
        console.error(`[RoomInit] Ошибка в ${roomName}:`, err);
    }
}

window.showRoom = showRoom;

/**
 * Инициализация при загрузке
 */
async function init() {
    console.log("[Init] Запуск Mini App...");
    
    if (tg) {
        tg.ready();
        tg.expand(); 
        tg.setHeaderColor('#4ec0ca'); 
        tg.setBackgroundColor('#4ec0ca');
    }

    // 1. Кошелек
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected ? "Connected" : "Disconnected");
        });
    } catch (e) {
        console.error("[Init] Wallet error:", e);
    }
    
    // 2. Игра
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // 3. Привязка событий клика
    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { e.preventDefault(); showRoom(room); };
    };

    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-start', 'game');
    bindClick('btn-top-icon', 'leaderboard');
    bindClick('btn-daily-icon', 'daily');

    document.querySelectorAll('.btn-home').forEach(btn => {
        btn.onclick = (e) => { e.preventDefault(); showRoom('home'); };
    });

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('home');

    // Кнопка возрождения (Revive) - Тратит жизнь
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = async () => {
            if (state.lives > 0) {
                state.lives--; // Тратим сердечко
                updateGlobalUI();
                showRoom('game');
                window.game?.revive();
            } else {
                tg?.showAlert("У вас нет сердечек ❤️");
            }
        };
    }

    // 4. Загрузка данных игрока
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        if (authData?.user) {
            state.user = authData.user;
            state.coins = authData.user.coins ?? state.coins;
            state.lives = authData.user.lives ?? state.lives;
            state.crystals = authData.user.crystals ?? state.crystals;

            // ДОБАВИТЬ ЭТО: Подгружаем способности
            if (authData.user.powerups) {
                state.powerups = { ...state.powerups, ...authData.user.powerups };
            }
            
            // Чтобы комнаты могли обращаться через window.state
            window.state = state; 
            
            updateGlobalUI();
        }
    } catch (e) {
        console.error("[Auth] Error:", e);
        window.state = state; // Все равно прокидываем дефолтный state
        updateGlobalUI();
    }
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
        // Показываем кнопку только если ревайв не юзали И есть запас жизней
        btnRevive.style.display = (!reviveUsed && state.lives > 0) ? 'block' : 'none';
    }
    
    api.saveScore(score).catch(console.error);
}

/**
 * Обновление баланса во всех местах
 */
function updateGlobalUI() {
    const coinValue = Number(state.coins).toLocaleString();
    
    // Монеты
    const coinTargets = ['coin-balance', 'revive-balance', 'header-coins'];
    coinTargets.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = coinValue;
    });

    // Жизни
    document.querySelectorAll('.stat-lives, #header-lives, #revive-lives-count').forEach(el => {
        el.innerText = state.lives;
    });

    // Кристаллы
    document.querySelectorAll('.stat-crystals, #header-crystals').forEach(el => {
        el.innerText = state.crystals;
    });
}

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };