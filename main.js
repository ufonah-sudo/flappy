import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

const tg = window.Telegram.WebApp;

// Безопасная инициализация TG
try {
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
        tg.setHeaderColor('#4ec0ca'); 
    }
} catch (e) {
    console.warn("Telegram WebApp init warning:", e);
}

const state = {
    user: null,
    coins: 0
};

const notify = (msg) => {
    if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) {
        tg.showAlert(msg);
    } else {
        alert(msg);
    }
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
    console.log("App initializing...");

    // 1. Ждем данные (максимум 3 секунды), чтобы не вешать приложение
    let attempts = 0;
    while (!tg.initData && !window.location.hash && attempts < 15) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    // 2. Инициализация кошелька и игры (делаем СРАЗУ, чтобы кнопки работали)
    const wallet = new WalletManager((isConnected) => {
        console.log("Wallet connected:", isConnected);
    });

    const canvas = document.getElementById('game-canvas');
    let game = null;
    if (canvas) {
        game = new Game(canvas, handleGameOver);
    } else {
        console.error("Canvas not found!");
    }

    // 3. Пытаемся авторизоваться
    const startParam = tg.initDataUnsafe ? tg.initDataUnsafe.start_param : null;
    try {
        const authData = await api.authPlayer(startParam);
        if (authData && authData.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateUI();
        } else {
            console.warn("Auth failed, continuing as guest");
        }
    } catch (err) {
        console.error("Auth Error:", err);
    }

    // 4. ОБРАБОТЧИКИ КНОПОК (Вынесено из условий, чтобы работали всегда)
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.onclick = () => {
            console.log("Game Start Clicked");
            ui.menu.classList.add('hidden');
            ui.gameOver.classList.add('hidden');
            ui.gameContainer.classList.remove('hidden');
            ui.scoreOverlay.innerText = '0';
            if (game) {
                game.resize();
                game.start();
            }
        };
    }

    document.getElementById('btn-leaderboard').onclick = async () => {
        ui.ldbModal.classList.remove('hidden');
        ui.ldbList.innerHTML = '<p>Loading...</p>';
        try {
            const top = await api.getLeaderboard();
            ui.ldbList.innerHTML = top.map((entry, i) => `
                <div class="leader-item" style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                    <span>${i + 1}. ${entry.username || 'Player'}</span>
                    <span style="font-weight: bold;">${entry.score}</span>
                </div>
            `).join('') || '<p>No scores yet</p>';
        } catch (e) {
            ui.ldbList.innerHTML = '<p>Error loading leaderboard</p>';
        }
    };

    document.getElementById('btn-invite').onclick = () => {
        const botUsername = 'ВАШ_БОТ_NAME'; // ЗАМЕНИТЬ!
        const userId = state.user ? state.user.id : '0';
        const inviteLink = `https://t.me/${botUsername}/app?startapp=${userId}`;
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Play Flappy TON!`;
        tg.openTelegramLink(shareLink);
    };

    document.getElementById('btn-shop').onclick = () => ui.shopModal.classList.remove('hidden');
    document.getElementById('btn-close-shop').onclick = () => ui.shopModal.classList.add('hidden');
    document.getElementById('btn-close-leaderboard').onclick = () => ui.ldbModal.classList.add('hidden');

    document.getElementById('btn-buy-1ton').onclick = async () => {
        if (!wallet.isConnected) return notify('Connect wallet first');
        const tx = await wallet.sendTransaction(1);
        if (tx && tx.success) {
            const res = await api.buyCoins(1);
            if (res && res.success) {
                state.coins = res.newBalance;
                updateUI();
                notify('Success! +10 Coins');
            }
        }
    };

    document.getElementById('btn-revive').onclick = async () => {
        if (state.coins < 1) return notify("Not enough coins!");
        const newBalance = await api.spendCoin();
        if (newBalance !== null && typeof newBalance !== 'undefined' && !newBalance.error) {
            state.coins = newBalance;
            updateUI();
            ui.gameOver.classList.add('hidden');
            ui.gameContainer.classList.remove('hidden');
            if (game) game.revive();
        }
    };

    document.getElementById('btn-restart').onclick = () => {
        ui.gameOver.classList.add('hidden');
        ui.menu.classList.remove('hidden');
        ui.gameContainer.classList.add('hidden');
    };

    window.addEventListener('scoreUpdate', (e) => {
        ui.scoreOverlay.innerText = e.detail;
    });

    function handleGameOver(score, reviveUsed) {
        ui.gameContainer.classList.add('hidden');
        ui.gameOver.classList.remove('hidden');
        ui.finalScore.innerText = score;
        ui.btnRevive.style.display = reviveUsed ? 'none' : 'block';
        api.saveScore(score);
    }
}

function updateUI() {
    if (ui.coinBalance) ui.coinBalance.innerText = state.coins;
    if (ui.reviveBalance) ui.reviveBalance.innerText = state.coins;
}

window.onload = init;