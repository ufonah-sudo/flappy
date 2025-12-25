import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

// Импорты комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;

// Глобальное состояние
const state = { 
    user: null, 
    coins: 0 
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

// Исправленная функция showRoom
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все экраны
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
        
        // Логика перемещения кнопки кошелька TON
        if (window.wallet && window.wallet.tonConnectUI) {
            if (roomName === 'shop') {
                window.wallet.tonConnectUI.uiOptions = { buttonRootId: 'shop-ton-wallet' };
            } else if (roomName === 'settings') {
                window.wallet.tonConnectUI.uiOptions = { buttonRootId: 'settings-ton-wallet' };
            }
        }

        // Остановка игрового цикла при уходе из игры
        if (roomName !== 'game' && window.game) {
            window.game.isRunning = false;
        }

        try {
            switch(roomName) {
                case 'game':
                    if (window.game) {
                        window.game.resize();
                        window.game.start();
                    }
                    break;
                case 'shop': initShop(); break;
                case 'inventory': initInventory(); break;
                case 'friends': initFriends(); break;
                case 'daily': initDaily(); break;
                case 'leaderboard': initLeaderboard(); break;
                case 'settings': initSettings(); break;
                case 'home':
                    updateGlobalUI();
                    break;
            }
        } catch (err) {
            console.error(`[Error] Ошибка комнаты ${roomName}:`, err);
        }
    }
}

// Делаем функцию доступной глобально
window.showRoom = showRoom;

async function init() {
    console.log("[Init] Приложение запускается...");
    
    if (tg) {
        tg.ready();
        tg.expand(); // Растягиваем на весь экран
        tg.setHeaderColor('#4ec0ca'); // Убираем белую полосу (цвет неба)
        tg.setBackgroundColor('#4ec0ca');
        tg.enableClosingConfirmation();
    }

    // 1. Инициализация Кошелька
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Кошелек:", isConnected ? "OK" : "DISCONNECTED");
        });
    } catch (e) {
        console.error("[Init] WalletManager error:", e);
    }
    
    // 2. Инициализация Игры
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // 3. Настройка кликов (исправлены ID под твой index.html)
    const setupClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = (e) => {
                e.preventDefault();
                showRoom(room);
            };
        }
    };

    setupClick('btn-start', 'game');
    setupClick('btn-shop', 'shop');
    setupClick('btn-leaderboard-panel', 'leaderboard'); // ID из твоего индекса
    setupClick('btn-friends', 'friends');
    setupClick('btn-inventory', 'inventory');
    setupClick('btn-settings', 'settings');
    setupClick('btn-home-panel', 'home'); // Кнопка HOME на панели
    
    // Иконки сверху (Top и Daily)
    setupClick('btn-top-icon', 'leaderboard');
    setupClick('btn-daily-icon', 'daily');

    document.querySelectorAll('.btn-home').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            showRoom('home');
        };
    });

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('home');

    // Кнопка возрождения
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = async () => {
            try {
                const res = await api.spendCoin(); 
                if (res !== null && !res.error) {
                    state.coins = res;
                    updateGlobalUI();
                    showRoom('game');
                    window.game?.revive();
                } else {
                    tg?.showAlert("Недостаточно монет!");
                }
            } catch (e) {
                console.error("Revive error:", e);
            }
        };
    }

    // 4. Авторизация
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        
        if (authData && authData.user) {
            state.user = authData.user;
            state.coins = authData.user.coins || 0;
            updateGlobalUI();
        }
    } catch (e) {
        console.error("[Auth] Fail:", e);
    }
}

function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.style.display = reviveUsed ? 'none' : 'block';
    }
    
    api.saveScore(score).catch(e => console.error("Score save failed:", e));
}

function updateGlobalUI() {
    const balanceIds = ['coin-balance', 'revive-balance', 'header-coins'];
    balanceIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = state.coins;
    });
}

window.updateGlobalUI = updateGlobalUI;
window.state = state;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };