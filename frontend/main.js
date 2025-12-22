import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Безопасная инициализация
try {
    tg.ready(); // Сообщаем, что приложение готово
    tg.expand(); // Разворачиваем
    if (tg.isVersionAtLeast('6.1')) {
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
    if (tg.showAlert) {
        tg.showAlert(msg);
    } else {
        alert(msg);
    }
};

// UI Элементы
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
    // --- ИСПРАВЛЕНИЕ: Ждем initData перед авторизацией ---
    let attempts = 0;
    while (!tg.initData && attempts < 10) {
        console.log("Waiting for Telegram data... Attempt:", attempts);
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    const startParam = tg.initDataUnsafe.start_param;
    
    try {
        const authData = await api.authPlayer(startParam);
        
        if (authData && authData.user) {
            state.user = authData.user;
            state.coins = authData.user.coins;
            updateUI();
        } else {
            console.error("Auth failed: No user data returned");
            notify("Connection error. Please open via Telegram Bot.");
        }
    } catch (err) {
        console.error("Critical Auth Error:", err);
        // Если сервер вернул 403, значит токен в Vercel не подходит к этому боту
        notify("Server 403: Please check BOT_TOKEN in Vercel.");
    }

    // 2. Инициализация кошелька TON
    const wallet = new WalletManager((isConnected) => {
        console.log("Wallet status:", isConnected);
    });

    // 3. Инициализация движка игры
    const game = new Game(document.getElementById('game-canvas'), handleGameOver);

    // --- ОБРАБОТЧИКИ КНОПОК ---

    document.getElementById('btn-start').onclick = () => {
        ui.menu.classList.add('hidden');
        ui.gameOver.classList.add('hidden');
        ui.gameContainer.classList.remove('hidden');
        ui.scoreOverlay.innerText = '0';
        game.resize();
        game.start();
    };

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
        if (!state.user) return;
        // Используем id из базы данных для реферальной ссылки
        const botUsername = 'ВАШ_БОТ_NAME'; // ЗАМЕНИ НА ЮЗЕРНЕЙМ СВОЕГО БОТА
        const inviteLink = `https://t.me/${botUsername}/app?startapp=${state.user.id}`;
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Play Flappy TON and get coins!`;
        tg.openTelegramLink(shareLink);
    };

    document.getElementById('btn-shop').onclick = () => {
        ui.shopModal.classList.remove('hidden');
    };

    document.getElementById('btn-close-shop').onclick = () => ui.shopModal.classList.add('hidden');
    document.getElementById('btn-close-leaderboard').onclick = () => ui.ldbModal.classList.add('hidden');

    document.getElementById('btn-buy-1ton').onclick = async () => {
        if (!wallet.isConnected) {
            notify('Please connect TON wallet first');
            return;
        }
        const tx = await wallet.sendTransaction(1);
        if (tx.success) {
            const res = await api.buyCoins(1);
            if (res.success) {
                state.coins = res.newBalance;
                updateUI();
                notify('Purchase successful! +10 Coins');
                ui.shopModal.classList.add('hidden');
            }
        }
    };

    document.getElementById('btn-revive').onclick = async () => {
        if (state.coins < 1) {
            notify("Not enough coins!");
            return;
        }
        
        const newBalance = await api.spendCoin();
        if (newBalance !== null) {
            state.coins = newBalance;
            updateUI();
            ui.gameOver.classList.add('hidden');
            ui.gameContainer.classList.remove('hidden');
            game.revive();
        } else {
            notify("Error spending coin.");
        }
    };

    document.getElementById('btn-restart').onclick = () => {
        ui.gameOver.classList.add('hidden');
        ui.menu.classList.remove('hidden');
        ui.gameContainer.classList.add('hidden');
    };

    document.getElementById('btn-share').onclick = () => {
        const score = ui.finalScore.innerText;
        const botUsername = 'ВАШ_БОТ_NAME'; // ЗАМЕНИ НА ЮЗЕРНЕЙМ СВОЕГО БОТА
        const shareLink = `https://t.me/share/url?url=https://t.me/${botUsername}/app&text=I scored ${score} in Flappy TON!`;
        tg.openTelegramLink(shareLink);
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
    ui.coinBalance.innerText = state.coins;
    ui.reviveBalance.innerText = state.coins;
}

// Запуск после полной загрузки страницы
window.onload = init;