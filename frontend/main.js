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

const tg = window.Telegram.WebApp;
const state = { user: null, coins: 0 };

// 1. Диспетчер сцен
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
    // Скрываем все сцены
    Object.values(scenes).forEach(s => s?.classList.add('hidden'));
    
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
        
        // ВАЖНО: Останавливаем игру, если уходим со сцены game
        if (roomName !== 'game' && window.game) {
            window.game.isRunning = false;
        }

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
        }
    }
}

// Делаем функции доступными глобально для HTML onclick событий
window.showRoom = showRoom;

// 2. Инициализация
async function init() {
    tg.ready();
    tg.expand();

    // Инициализация кошелька
    window.wallet = new WalletManager((isConnected) => {
        console.log("Wallet Connected:", isConnected);
        // Можно обновить UI кошелька здесь
    });
    
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // Привязка кнопок панели управления
    const setupClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            e.preventDefault();
            showRoom(room);
        };
    };

    setupClick('btn-start', 'game');
    setupClick('btn-shop', 'shop');
    setupClick('btn-leaderboard', 'leaderboard');
    setupClick('btn-friends', 'friends');
    setupClick('btn-inventory', 'inventory');
    setupClick('btn-daily', 'daily');
    setupClick('btn-settings', 'settings');
    setupClick('btn-restart-panel', 'home'); 
    
    // Глобальные кнопки возврата
    document.querySelectorAll('.btn-home').forEach(btn => {
        btn.onclick = () => showRoom('home');
    });

    // Game Over логика
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('home');

    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = async () => {
            const res = await api.spendCoin();
            if (res && !res.error) {
                state.coins = res;
                updateGlobalUI();
                showRoom('game');
                window.game?.revive();
            } else {
                tg.showAlert("Недостаточно монет для возрождения!");
            }
        };
    }

    // Загрузка данных пользователя
    try {
        const startParam = tg.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam);
        if (authData && authData.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateGlobalUI();
        }
    } catch (e) {
        console.error("Auth initialization failed:", e);
    }
}

function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        // Показываем кнопку возрождения только если она еще не использовалась
        btnRevive.style.display = reviveUsed ? 'none' : 'block';
    }
    
    api.saveScore(score).then(res => {
        console.log("Score saved:", res);
    });
}

function updateGlobalUI() {
    const balanceElements = ['coin-balance', 'revive-balance'];
    balanceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = state.coins;
    });
}

// Привязываем обновление UI к окну, чтобы другие модули могли его вызвать
window.updateGlobalUI = updateGlobalUI;
window.state = state;

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };