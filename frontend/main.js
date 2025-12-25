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

// 1. Диспетчер сцен (Комнат)
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
    
    // Показываем нужную
    const target = scenes[roomName];
    if (target) {
        target.classList.remove('hidden');
        console.log(`[Navigation] Switched to: ${roomName}`);
        
        // ВЫЗОВ ЛОГИКИ КОНКРЕТНОЙ КОМНАТЫ
        switch(roomName) {
            case 'game':
                window.game?.resize();
                window.game?.start();
                break;
            case 'shop':
                initShop();
                break;
            case 'inventory':
                initInventory();
                break;
            case 'friends':
                initFriends();
                break;
            case 'daily':
                initDaily();
                break;
            case 'leaderboard':
                initLeaderboard();
                break;
            case 'settings':
                initSettings();
                break;
        }
    }
}

// 2. Инициализация при загрузке
async function init() {
    tg.ready();
    tg.expand();

    // Инициализация кошелька
    window.wallet = new WalletManager((isConnected) => console.log("Wallet Connected:", isConnected));
    
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
    }

    // Привязка кнопок панели
    const bindBtn = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => showRoom(room);
    };

    bindBtn('btn-start', 'game');
    bindBtn('btn-shop', 'shop');
    bindBtn('btn-leaderboard', 'leaderboard');
    bindBtn('btn-friends', 'friends');
    bindBtn('btn-inventory', 'inventory');
    bindBtn('btn-daily', 'daily');
    bindBtn('btn-settings', 'settings');
    bindBtn('btn-restart-panel', 'home'); // Твоя кнопка HOME на панели
    
    // Кнопки возврата домой (те, что внутри комнат с классом .btn-home)
    document.querySelectorAll('.btn-home').forEach(btn => {
        btn.onclick = () => showRoom('home');
    });

    // Обработка кнопки "Играть заново" после Game Over
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.onclick = () => showRoom('home');

    // Первичная авторизация
    try {
        const startParam = tg.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam);
        if (authData?.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateGlobalUI();
        }
    } catch (e) {
        console.error("Auth failed:", e);
    }
}

function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) btnRevive.style.display = reviveUsed ? 'none' : 'block';
    
    api.saveScore(score);
}

function updateGlobalUI() {
    // Обновляем все элементы с балансом (в хедере и магазинах)
    const balanceElements = [
        document.getElementById('coin-balance'),
        document.getElementById('revive-balance')
    ];
    balanceElements.forEach(el => {
        if (el) el.innerText = state.coins;
    });
}

window.onload = init;

export { showRoom, state, updateGlobalUI };