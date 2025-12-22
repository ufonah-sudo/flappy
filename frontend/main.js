import * as api from './api.js'; // Импортируем все функции из api.js
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const state = {
    user: null,
    coins: 0
};

const ui = {
    menu: document.getElementById('menu'),
    gameContainer: document.getElementById('game-container'),
    gameOver: document.getElementById('game-over'),
    scoreOverlay: document.getElementById('score-overlay'),
    coinBalance: document.getElementById('coin-balance'),
    reviveBalance: document.getElementById('revive-balance'),
    finalScore: document.getElementById('final-score'),
    btnRevive: document.getElementById('btn-revive'),
    shopModal: document.getElementById('shop-modal'),
    ldbModal: document.getElementById('leaderboard-modal'),
    ldbList: document.getElementById('leaderboard-list')
};

async function init() {
    // 1. Авторизация
    const startParam = tg.initDataUnsafe.start_param;
    const authData = await api.authPlayer(startParam); // Используем функцию из api.js
    
    if (authData && authData.user) {
        state.user = authData.user;
        state.coins = authData.user.coins;
        updateUI();
    } else {
        tg.showAlert("Failed to connect to server. Check your connection.");
    }

    // 2. Кошелек
    const wallet = new WalletManager((isConnected) => {
        console.log("Wallet connected:", isConnected);
    });

    // 3. Игра
    const game = new Game(document.getElementById('game-canvas'), handleGameOver);

    // --- КНОПКИ МЕНЮ ---

    document.getElementById('btn-start').onclick = () => {
        ui.menu.classList.add('hidden');
        ui.gameContainer.classList.remove('hidden');
        game.start();
    };

    document.getElementById('btn-leaderboard').onclick = async () => {
        ui.ldbModal.classList.remove('hidden');
        ui.ldbList.innerHTML = '<p>Loading...</p>';
        const top = await api.getLeaderboard();
        ui.ldbList.innerHTML = top.map((entry, i) => `
            <div class="leader-item">
                <span>${i+1}. ${entry.users.username}</span>
                <span>${entry.score}</span>
            </div>
        `).join('') || '<p>No scores yet</p>';
    };

    document.getElementById('btn-invite').onclick = () => {
        if (!state.user) return;
        const link = `https://t.me/share/url?url=https://t.me/ВАШ_БОТ/app?startapp=${state.user.telegram_id}&text=Play Flappy TON and get coins!`;
        tg.openTelegramLink(link);
    };

    // --- МАГАЗИН ---

    document.getElementById('btn-shop').onclick = () => ui.shopModal.classList.remove('hidden');
    document.getElementById('btn-close-shop').onclick = () => ui.shopModal.classList.add('hidden');
    document.getElementById('btn-close-leaderboard').onclick = () => ui.ldbModal.classList.add('hidden');

    document.getElementById('btn-buy-1ton').onclick = async () => {
        if (!wallet.isConnected) {
            tg.showAlert('Please connect TON wallet');
            return;
        }
        const tx = await wallet.sendTransaction(1); 
        if (tx.success) {
            const res = await api.buyCoins(1);
            if (res.success) {
                state.coins = res.newBalance;
                updateUI();
                tg.showAlert('Success! +10 Coins');
                ui.shopModal.classList.add('hidden');
            }
        }
    };

    // --- ИГРОВОЙ ЦИКЛ ---

    document.getElementById('btn-revive').onclick = async () => {
        if (state.coins < 1) {
            tg.showAlert("Not enough coins!");
            return;
        }
        const newBalance = await api.spendCoin();
        if (newBalance !== null) {
            state.coins = newBalance;
            updateUI();
            ui.gameOver.classList.add('hidden');
            game.revive();
        }
    };

    document.getElementById('btn-restart').onclick = () => {
        ui.gameOver.classList.add('hidden');
        ui.menu.classList.remove('hidden');
    };

    window.addEventListener('scoreUpdate', (e) => {
        ui.scoreOverlay.innerText = e.detail;
    });

    function handleGameOver(score, reviveUsed) {
        ui.gameContainer.classList.add('hidden');
        ui.gameOver.classList.remove('hidden');
        ui.finalScore.innerText = score;
        ui.btnRevive.classList.toggle('hidden', reviveUsed);
        api.saveScore(score); // Сохраняем на бэкенд
    }
}

function updateUI() {
    ui.coinBalance.innerText = state.coins;
    ui.reviveBalance.innerText = state.coins;
}

init();