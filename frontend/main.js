import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

// Импортируем инициализаторы комнат из папки js/rooms/
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;
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
 * @param {string} roomName - Название сцены из объекта scenes
 */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все сцены (добавляем класс hidden)
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
        
        // Остановка игрового цикла, если мы не на экране игры
        if (roomName !== 'game' && window.game) {
            window.game.isRunning = false;
        }

        // Вызов инициализации конкретной комнаты
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
        console.warn(`[Navigation] Сцена "${roomName}" не найдена! Проверьте ID в index.html`);
    }
}

// Делаем функцию доступной для onclick в HTML
window.showRoom = showRoom;

/**
 * Главная инициализация приложения
 */
async function init() {
    console.log("[Init] Запуск приложения...");
    
    if (tg) {
        tg.ready();
        tg.expand();
    }

    // 1. Инициализация кошелька TON
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус кошелька:", isConnected ? "Подключен" : "Отключен");
        });
    } catch (e) {
        console.error("[Init] Ошибка WalletManager:", e);
    }
    
    // 2. Инициализация игрового движка
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // 3. Настройка обработчиков событий для кнопок навигации
    const setupClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = (e) => {
                e.preventDefault();
                showRoom(room);
            };
        }
    };

    // Привязываем ID кнопок из index.html к комнатам
    setupClick('btn-start', 'game');
    setupClick('btn-shop', 'shop');
    setupClick('btn-leaderboard', 'leaderboard');
    setupClick('btn-friends', 'friends');
    setupClick('btn-inventory', 'inventory');
    setupClick('btn-daily', 'daily');
    setupClick('btn-settings', 'settings');
    setupClick('btn-restart-panel', 'home'); 
    
    // Кнопки возврата "Домой" (может быть несколько на разных экранах)
    document.querySelectorAll('.btn-home').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            showRoom('home');
        };
    });

    // Кнопка рестарта на экране Game Over
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('home');

    // Логика возрождения (Revive) за монеты
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = async () => {
            try {
                const res = await api.spendCoin(); // Запрос к /api/coins.js
                if (res && !res.error) {
                    state.coins = res.newBalance || res;
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

    // 4. Загрузка данных игрока (Авторизация)
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); // Запрос к /api/auth.js
        
        if (authData && authData.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateGlobalUI();
        }
    } catch (e) {
        console.error("[Auth] Ошибка авторизации:", e);
    }
}

/**
 * Вызывается из game.js при проигрыше
 */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        // Прячем кнопку возрождения, если она уже была использована в этом раунде
        btnRevive.style.display = reviveUsed ? 'none' : 'block';
    }
    
    // Сохраняем рекорд в базу через API
    api.saveScore(score).catch(e => console.error("Ошибка сохранения рекорда:", e));
}

/**
 * Синхронизирует отображение монет во всех элементах интерфейса
 */
function updateGlobalUI() {
    const balanceElements = ['coin-balance', 'revive-balance', 'header-coins'];
    balanceElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = state.coins;
    });
}

// Привязываем state и обновление UI к window для доступа из других модулей (js/rooms/)
window.updateGlobalUI = updateGlobalUI;
window.state = state;

// Запуск при полной загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };