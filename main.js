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
    console.error("TG Init Error:", e);
}

const state = { user: null, coins: 0 };

// Безопасный поиск элементов
const getEl = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element with id "${id}" not found!`);
    return el;
};

// Вспомогательный UI метод
const notify = (msg) => {
    if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) {
        tg.showAlert(msg);
    } else {
        alert(msg);
    }
};

// UI Элементы
const ui = {
    menu: getEl('menu'),
    gameContainer: getEl('game-container'),
    gameOver: getEl('game-over'),
    scoreOverlay: getEl('score-overlay'),
    coinBalance: getEl('coin-balance'),
    reviveBalance: getEl('revive-balance'),
    finalScore: getEl('final-score'),
    btnRevive: getEl('btn-revive'),
    shopModal: getEl('shop-modal'),
    ldbModal: getEl('leaderboard-modal'),
    ldbList: getEl('leaderboard-list')
};

function updateUI() {
    if (ui.coinBalance) ui.coinBalance.innerText = state.coins;
    if (ui.reviveBalance) ui.reviveBalance.innerText = state.coins;
}

async function init() {
    console.log("Starting initialization...");

    // 1. Инициализируем кошелек и игру СРАЗУ
    const wallet = new WalletManager((isConnected) => {
        console.log("Wallet connected:", isConnected);
    });

    const canvas = getEl('game-canvas');
    let game = null;
    if (canvas) {
        game = new Game(canvas, handleGameOver);
    }

    function handleGameOver(score, reviveUsed) {
        ui.gameContainer?.classList.add('hidden');
        ui.gameOver?.classList.remove('hidden');
        if (ui.finalScore) ui.finalScore.innerText = score;
        ui.btnRevive.style.display = reviveUsed ? 'none' : 'block';
        api.saveScore(score);
    }

    // 2. Назначаем клики (ВСЕ важные функции возвращены)
    const btnStart = getEl('btn-start');
    if (btnStart) {
        btnStart.onclick = () => {
            ui.menu?.classList.add('hidden');
            ui.gameOver?.classList.add('hidden');
            ui.gameContainer?.classList.remove('hidden');
            if (ui.scoreOverlay) ui.scoreOverlay.innerText = '0';
            game?.resize();
            game?.start();
        };
    }

    getEl('btn-leaderboard').onclick = async () => {
        ui.ldbModal?.classList.remove('hidden');
        if (ui.ldbList) ui.ldbList.innerHTML = 'Loading...';
        try {
            const top = await api.getLeaderboard();
            if (ui.ldbList) ui.ldbList.innerHTML = top.map((entry, i) => 
                `<div class="leader-item" style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                    <span>${i + 1}. ${entry.username || 'Player'}</span>
                    <span style="font-weight: bold;">${entry.score}</span>
                </div>`
            ).join('') || '<p>No scores yet</p>';
        } catch (e) {
            if (ui.ldbList) ui.ldbList.innerHTML = 'Error loading leaderboard';
        }
    };

    getEl('btn-invite').onclick = () => {
        const botUsername = 'ВАШ_БОТ_NAME'; // ЗАМЕНИТЬ!
        const userId = state.user ? state.user.id : '0';
        const inviteLink = `https://t.me/${botUsername}/app?startapp=${userId}`;
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Play Flappy TON and get coins!`;
        tg.openTelegramLink(shareLink);
    };

    getEl('btn-shop').onclick = () => ui.shopModal?.classList.remove('hidden');
    getEl('btn-close-shop').onclick = () => ui.shopModal?.classList.add('hidden');
    getEl('btn-close-leaderboard').onclick = () => ui.ldbModal?.classList.add('hidden');

    getEl('btn-buy-1ton').onclick = async () => {
        if (!wallet.isConnected) return notify('Please connect TON wallet first');
        const tx = await wallet.sendTransaction(1);
        if (tx && tx.success) {
            const res = await api.buyCoins(1);
            if (res && res.success) {
                state.coins = res.newBalance;
                updateUI();
                notify('Purchase successful! +10 Coins');
            }
        }
    };

    getEl('btn-revive').onclick = async () => {
        if (state.coins < 1) return notify("Not enough coins!");
        const newBalance = await api.spendCoin();
        if (newBalance !== null && typeof newBalance !== 'undefined' && !newBalance.error) {
            state.coins = newBalance;
            updateUI();
            ui.gameOver?.classList.add('hidden');
            ui.gameContainer?.classList.remove('hidden');
            game?.revive();
        } else {
            notify("Error spending coin.");
        }
    };

    getEl('btn-restart').onclick = () => {
        ui.gameOver?.classList.add('hidden');
        ui.menu?.classList.remove('hidden');
        ui.gameContainer?.classList.add('hidden');
    };

    getEl('btn-share').onclick = () => {
        const score = ui.finalScore?.innerText || '0';
        const botUsername = 'ВАШ_БОТ_NAME'; // ЗАМЕНИТЬ!
        const shareLink = `https://t.me/share/url?url=https://t.me/${botUsername}/app&text=I scored ${score} in Flappy TON!`;
        tg.openTelegramLink(shareLink);
    };

    window.addEventListener('scoreUpdate', (e) => {
        if (ui.scoreOverlay) ui.scoreOverlay.innerText = e.detail;
    });

    // 3. Авторизация в фоне
    try {
        const startParam = tg.initDataUnsafe?.start_param;
        const authData = await api.authPlayer(startParam);
        if (authData?.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateUI();
        }
    } catch (e) {
        console.error("Auth failed:", e);
    }
}

window.onload = init;