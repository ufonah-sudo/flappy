import { ApiClient } from './api_client.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

// Init Telegram
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const api = new ApiClient();
const state = {
    user: null,
    coins: 0
};

// UI Elements
const ui = {
    menu: document.getElementById('menu'),
    gameContainer: document.getElementById('game-container'),
    gameOver: document.getElementById('game-over'),
    scoreOverlay: document.getElementById('score-overlay'),
    coinBalance: document.getElementById('coin-balance'),
    reviveBalance: document.getElementById('revive-balance'),
    finalScore: document.getElementById('final-score'),
    btnRevive: document.getElementById('btn-revive'),
    shopModal: document.getElementById('shop-modal')
};

// Init Logic
async function init() {
    // 1. Login & Referrals
    const startParam = tg.initDataUnsafe.start_param;
    const authData = await api.login(startParam);
    
    if (authData.user) {
        state.user = authData.user;
        state.coins = authData.user.coins;
        updateUI();
    }

    // 2. Wallet
    const wallet = new WalletManager((isConnected) => {
        console.log("Wallet status:", isConnected);
    });

    // 3. Game Instance
    const game = new Game(document.getElementById('game-canvas'), handleGameOver);

    // Event Listeners
    document.getElementById('btn-start').onclick = () => {
        ui.menu.classList.add('hidden');
        ui.gameContainer.classList.remove('hidden');
        ui.scoreOverlay.innerText = '0';
        game.start();
    };

    document.getElementById('btn-restart').onclick = () => {
        ui.gameOver.classList.add('hidden');
        ui.menu.classList.remove('hidden');
    };

    document.getElementById('btn-invite').onclick = () => {
        const link = `https://t.me/share/url?url=https://t.me/YOUR_BOT_NAME/app?startapp=${state.user.telegram_id}&text=Play Flappy and get coins!`;
        tg.openTelegramLink(link);
    };

    document.getElementById('btn-shop').onclick = () => {
        if (!wallet.isConnected) {
            tg.showAlert('Please connect TON wallet first');
            return;
        }
        ui.shopModal.classList.remove('hidden');
    };

    document.getElementById('btn-close-shop').onclick = () => ui.shopModal.classList.add('hidden');

    document.getElementById('btn-buy-1ton').onclick = async () => {
        // Mock Transaction Logic
        const tx = await wallet.sendTransaction(1); // 1 TON
        if (tx.success) {
            const res = await api.buyCoins(1); // 1 TON buy
            if (res.success) {
                state.coins = res.newBalance;
                updateUI();
                tg.showAlert('Purchase successful! +10 Coins');
                ui.shopModal.classList.add('hidden');
            }
        }
    };

    document.getElementById('btn-revive').onclick = async () => {
        if (state.coins < 1) {
            tg.showAlert("Not enough coins!");
            return;
        }
        
        const res = await api.spendCoin();
        if (res.success) {
            state.coins = res.newBalance;
            updateUI();
            ui.gameOver.classList.add('hidden');
            game.revive();
        } else {
            tg.showAlert(res.message);
        }
    };

    document.getElementById('btn-share').onclick = () => {
        const score = document.getElementById('final-score').innerText;
        tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/YOUR_BOT&text=I scored ${score} in Flappy Bird!`);
    };

    window.addEventListener('scoreUpdate', (e) => {
        ui.scoreOverlay.innerText = e.detail;
    });

    function handleGameOver(score, reviveUsed) {
        ui.gameContainer.classList.add('hidden'); // Optional: keep visible in bg
        ui.gameOver.classList.remove('hidden');
        ui.finalScore.innerText = score;
        
        // Hide revive button if already used
        ui.btnRevive.style.display = reviveUsed ? 'none' : 'block';
        
        // Submit score
        api.submitScore(score);
    }
}

function updateUI() {
    ui.coinBalance.innerText = state.coins;
    ui.reviveBalance.innerText = state.coins;
}

init();