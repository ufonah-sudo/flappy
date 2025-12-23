import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

const tg = window.Telegram.WebApp;
const BOT_USERNAME = 'FlappyTonBird_bot'; // Твой ник зафиксирован

// Безопасная инициализация интерфейса Telegram
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

const getEl = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element with id "${id}" not found!`);
    return el;
};

const notify = (msg) => {
    if (tg && tg.showAlert) {
        tg.showAlert(msg);
    } else {
        alert(msg);
    }
};

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
    console.log("App initializing...");

    // 1. Кошелек и Игра
    const wallet = new WalletManager((isConnected) => {
        console.log("Wallet connection state:", isConnected);
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
        
        // Кнопка воскрешения доступна только 1 раз за игру
        if (ui.btnRevive) {
            ui.btnRevive.style.display = reviveUsed ? 'none' : 'block';
        }
        
        // Сохраняем результат в БД
        api.saveScore(score).catch(err => console.error("Save score error:", err));
    }

    // 2. Обработка кнопок
    getEl('btn-start').onclick = () => {
        ui.menu?.classList.add('hidden');
        ui.gameOver?.classList.add('hidden');
        ui.gameContainer?.classList.remove('hidden');
        if (ui.scoreOverlay) ui.scoreOverlay.innerText = '0';
        game?.resize();
        game?.start();
    };

    getEl('btn-leaderboard').onclick = async () => {
        ui.ldbModal?.classList.remove('hidden');
        if (ui.ldbList) ui.ldbList.innerHTML = '<p>Loading...</p>';
        try {
            const top = await api.getLeaderboard();
            if (ui.ldbList) {
                ui.ldbList.innerHTML = (top && top.length > 0) 
                    ? top.map((entry, i) => `
                        <div class="leader-item" style="display:flex; justify-content:space-between; margin: 10px 0;">
                            <span>${i + 1}. ${entry.username}</span>
                            <b>${entry.score}</b>
                        </div>`).join('')
                    : '<p>No records yet</p>';
            }
        } catch (e) {
            if (ui.ldbList) ui.ldbList.innerHTML = 'Failed to load';
        }
    };

    getEl('btn-invite').onclick = () => {
        const userId = state.user?.id || tg.initDataUnsafe?.user?.id || '0';
        const inviteLink = `https://t.me/${BOT_USERNAME}/app?startapp=${userId}`;
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Play Flappy TON and get coins!`;
        tg.openTelegramLink(shareLink);
    };

    getEl('btn-shop').onclick = () => ui.shopModal?.classList.remove('hidden');
    getEl('btn-close-shop').onclick = () => ui.shopModal?.classList.add('hidden');
    getEl('btn-close-leaderboard').onclick = () => ui.ldbModal?.classList.add('hidden');

    getEl('btn-buy-1ton').onclick = async () => {
        if (!wallet.isConnected) return notify('Connect wallet first!');
        try {
            const tx = await wallet.sendTransaction(1); // 1 TON
            if (tx) {
                const res = await api.buyCoins(1);
                if (res && !res.error) {
                    state.coins = res.newBalance;
                    updateUI();
                    notify('Success! +10 Coins');
                }
            }
        } catch (e) {
            notify('Transaction failed or cancelled');
        }
    };

    getEl('btn-revive').onclick = async () => {
        if (state.coins < 1) return notify("You need at least 1 Coin!");
        
        const result = await api.spendCoin();
        // Числовой баланс 0 тоже валиден, поэтому проверяем тип
        if (typeof result === 'number') {
            state.coins = result;
            updateUI();
            ui.gameOver?.classList.add('hidden');
            ui.gameContainer?.classList.remove('hidden');
            game?.revive();
        } else {
            notify("Error: Transaction failed.");
        }
    };

    getEl('btn-restart').onclick = () => {
        ui.gameOver?.classList.add('hidden');
        ui.gameContainer?.classList.add('hidden');
        ui.menu?.classList.remove('hidden');
    };

    getEl('btn-share').onclick = () => {
        const score = ui.finalScore?.innerText || '0';
        const shareLink = `https://t.me/share/url?url=https://t.me/${BOT_USERNAME}/app&text=My score is ${score}! Can you beat it?`;
        tg.openTelegramLink(shareLink);
    };

    window.addEventListener('scoreUpdate', (e) => {
        if (ui.scoreOverlay) ui.scoreOverlay.innerText = e.detail;
    });

    // 3. Первичная авторизация
    try {
        const startParam = tg.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam);
        if (authData?.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateUI();
        }
    } catch (e) {
        console.error("Initialization auth failed:", e);
    }
}

window.onload = init;