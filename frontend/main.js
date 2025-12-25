import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

// Импортируем инициализаторы комнат
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

// 1. Диспетчер сцен (DOM элементы)
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
 * Переключение между экранами
 */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все сцены
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
        
        // Остановка игры при уходе с экрана
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
            console.error(`[Error] Ошибка инициализации комнаты ${roomName}:`, err);
        }
    } else {
        console.warn(`[Navigation] Сцена "${roomName}" не найдена в DOM!`);
    }
}

window.showRoom = showRoom;

/**
 * Инициализация
 */
async function init() {
    console.log("[Init] Запуск приложения...");
    
    if (tg) {
        tg.ready();
        tg.expand();
        // Включаем подтверждение закрытия, чтобы пользователь случайно не вышел
        tg.enableClosingConfirmation();
    }

    // 1. Кошелек
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус кошелька:", isConnected ? "Подключен" : "Отключен");
        });
    } catch (e) {
        console.error("[Init] WalletManager failed:", e);
    }
    
    // 2. Игра
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // 3. Обработчики кнопок
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
                if (res && !res.error) {
                    state.coins = res.newBalance !== undefined ? res.newBalance : res;
                    updateGlobalUI();
                    showRoom('game');
                    window.game?.revive();
                } else {
                    if (tg) tg.showAlert("Недостаточно монет!");
                    else alert("Недостаточно монет!");
                }
            } catch (e) {
                console.error("Revive error:", e);
            }
        };
    }

    // 4. Авторизация
    try {
        // Безопасное получение start_param
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        
        if (authData && authData.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateGlobalUI();
        }
    } catch (e) {
        console.error("[Auth] Ошибка авторизации:", e);
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
    
    api.saveScore(score).catch(e => console.error("Save score error:", e));
}

function updateGlobalUI() {
    const balanceElements = ['coin-balance', 'revive-balance', 'header-coins'];
    balanceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Анимация числа, если нужно, или просто текст
            el.innerText = state.coins;
        }
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