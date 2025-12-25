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

function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
        
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

window.showRoom = showRoom;

async function init() {
    console.log("[Init] Приложение запускается...");
    
    if (tg) {
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();
    }

    // 1. Кошелек
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Кошелек:", isConnected ? "OK" : "DISCONNECTED");
        });
    } catch (e) {
        console.error("[Init] WalletManager error:", e);
    }
    
    // 2. Игра
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // Слушатель для обновления счета во время игры
    window.addEventListener('scoreUpdate', (e) => {
        // Если хочешь, чтобы монеты прибавлялись прямо в полете:
        // state.coins++; 
        // updateGlobalUI();
    });

    // 3. Настройка кнопок
    const setupClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                showRoom(room);
            };
        }
    };

    setupClick('btn-start', 'game');
    setupClick('btn-shop', 'shop');
    setupClick('btn-leaderboard', 'leaderboard');
    setupClick('btn-friends', 'friends');
    setupClick('btn-inventory', 'inventory');
    setupClick('btn-daily', 'daily');
    setupClick('btn-settings', 'settings');
    setupClick('btn-restart-panel', 'home'); 
    
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
                    tg?.showAlert("Недостаточно монет для возрождения!");
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
        // Показываем кнопку возрождения только если она еще не была использована в этом раунде
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

// Экспортируем функции в window для доступа из других модулей (shop.js и др.)
window.updateGlobalUI = updateGlobalUI;
window.state = state;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };