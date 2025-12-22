import * as api from './api.js';
import { Game } from './game.js';
import { WalletManager } from './wallet.js';

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();
// Устанавливаем цвет хедера под фон игры
tg.setHeaderColor('#4ec0ca'); 

const state = {
    user: null,
    coins: 0
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
    // 1. Авторизация и загрузка данных пользователя
    const startParam = tg.initDataUnsafe.start_param;
    const authData = await api.authPlayer(startParam);
    
    if (authData && authData.user) {
        state.user = authData.user;
        state.coins = authData.user.coins;
        updateUI();
    } else {
        tg.showAlert("Failed to connect to server.");
    }

    // 2. Инициализация кошелька TON
    const wallet = new WalletManager((isConnected) => {
        console.log("Wallet status:", isConnected);
    });

    // 3. Инициализация движка игры
    const game = new Game(document.getElementById('game-canvas'), handleGameOver);

    // --- ОБРАБОТЧИКИ КНОПОК ---

    // Старт игры
    document.getElementById('btn-start').onclick = () => {
        ui.menu.classList.add('hidden');
        ui.gameOver.classList.add('hidden'); // На случай рестарта
        ui.gameContainer.classList.remove('hidden');
        ui.scoreOverlay.innerText = '0';
        game.resize(); // Важно для корректных координат
        game.start();
    };

    // Лидерборд
    document.getElementById('btn-leaderboard').onclick = async () => {
        ui.ldbModal.classList.remove('hidden');
        ui.ldbList.innerHTML = '<p>Loading...</p>';
        const top = await api.getLeaderboard();
        ui.ldbList.innerHTML = top.map((entry, i) => `
            <div class="leader-item" style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                <span>${i + 1}. ${entry.users.username || 'Player'}</span>
                <span style="font-weight: bold;">${entry.score}</span>
            </div>
        `).join('') || '<p>No scores yet</p>';
    };

    // Инвайт (Рефералка)
    document.getElementById('btn-invite').onclick = () => {
        if (!state.user) return;
        const link = `https://t.me/share/url?url=https://t.me/ВАШ_БОТ_NAME/app?startapp=${state.user.telegram_id}&text=Play Flappy TON and get coins!`;
        tg.openTelegramLink(link);
    };

    // Магазин
    document.getElementById('btn-shop').onclick = () => {
        // Убрал жесткую блокировку "без кошелька", чтобы просто показать цены, 
        // но проверку оставил на кнопке покупки
        ui.shopModal.classList.remove('hidden');
    };

    document.getElementById('btn-close-shop').onclick = () => ui.shopModal.classList.add('hidden');
    document.getElementById('btn-close-leaderboard').onclick = () => ui.ldbModal.classList.add('hidden');

    // Покупка 10 монет за 1 TON
    document.getElementById('btn-buy-1ton').onclick = async () => {
        if (!wallet.isConnected) {
            tg.showAlert('Please connect TON wallet first');
            return;
        }
        const tx = await wallet.sendTransaction(1); // Отправляем 1 TON
        if (tx.success) {
            const res = await api.buyCoins(1);
            if (res.success) {
                state.coins = res.newBalance;
                updateUI();
                tg.showAlert('Purchase successful! +10 Coins');
                ui.shopModal.classList.add('hidden');
            }
        }
    };

    // Возрождение за монету
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
            ui.gameContainer.classList.remove('hidden');
            game.revive();
        } else {
            tg.showAlert("Error spending coin.");
        }
    };

    // Вернуться в меню
    document.getElementById('btn-restart').onclick = () => {
        ui.gameOver.classList.add('hidden');
        ui.menu.classList.remove('hidden');
        ui.gameContainer.classList.add('hidden');
    };

    // Шаринг результата (из твоей первой версии)
    document.getElementById('btn-share').onclick = () => {
        const score = ui.finalScore.innerText;
        const shareLink = `https://t.me/share/url?url=https://t.me/ВАШ_БОТ_NAME/app&text=I scored ${score} in Flappy TON! Can you beat me?`;
        tg.openTelegramLink(shareLink);
    };

    // Слушатель обновления счета во время игры
    window.addEventListener('scoreUpdate', (e) => {
        ui.scoreOverlay.innerText = e.detail;
    });

    // Функция завершения игры
    function handleGameOver(score, reviveUsed) {
        ui.gameContainer.classList.add('hidden');
        ui.gameOver.classList.remove('hidden');
        ui.finalScore.innerText = score;
        
        // Скрываем кнопку revive, если она уже была использована в этом раунде
        ui.btnRevive.style.display = reviveUsed ? 'none' : 'block';
        
        // Отправляем результат на сервер
        api.saveScore(score);
    }
}

// Функция обновления баланса в интерфейсе
function updateUI() {
    ui.coinBalance.innerText = state.coins;
    ui.reviveBalance.innerText = state.coins;
}

// Запуск приложения
init();