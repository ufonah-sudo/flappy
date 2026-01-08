/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Назначение: Импорты, Глобальный стейт, Навигация, Магазин и Синхронизация данных.
 */

// --- 1. ИМПОРТЫ МОДУЛЕЙ ---
import * as api from './api.js';           // Модуль API (Бэкенд)
import { Game } from './game.js';           // Движок Классики
import { ArcadeGame } from './arcade.js';   // Движок Аркады
import { WalletManager } from './wallet.js'; // TON Кошелек

// Импорт инициализаторов комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

// Инициализация Telegram SDK
const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   --------------------------------------------------------- */
const state = { 
    user: null,                // Данные профиля
    coins: 0,                  // Монеты
    lives: 3,                  // Энергия
    crystals: 0,               // Кристаллы
    inventory: [],             // Массив купленных предметов (Скины и т.д.)
    currentMode: 'classic',    // Режим игры
    settings: { sound: true, music: true },
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 }
};

/* ---------------------------------------------------------
   3. КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ (SCENES)
   --------------------------------------------------------- */
const scenes = {
    home: document.getElementById('scene-home'),
    modeSelection: document.getElementById('scene-mode-selection'),
    game: document.getElementById('game-container'),
    shop: document.getElementById('scene-shop'),
    leaderboard: document.getElementById('scene-leaderboard'),
    friends: document.getElementById('scene-friends'),
    inventory: document.getElementById('scene-inventory'),
    daily: document.getElementById('scene-daily'),
    settings: document.getElementById('scene-settings'),
    gameOver: document.getElementById('game-over'),
    pauseMenu: document.getElementById('pause-menu')
};

/* ---------------------------------------------------------
   4. ФУНКЦИИ СОХРАНЕНИЯ (Синхронизация)
   --------------------------------------------------------- */

// Сохранение данных в localStorage и отправка на сервер
async function saveData() {
    // Сохраняем локально, чтобы данные не пропали при обновлении
    localStorage.setItem('game_state', JSON.stringify({
        coins: state.coins,
        inventory: state.inventory,
        powerups: state.powerups
    }));

    // Отправляем на бэкенд (если API поддерживает метод updateUserData)
    try {
        if (api.syncState) {
            // Передаем весь объект state на сервер
            await api.syncState(state);
            console.log("Данные синхронизированы!");
        }
    } catch (e) {
        console.warn("Ошибка сохранения на сервер:", e);
    }
}
window.saveData = saveData; // Делаем доступным глобально
async function activateAbility(id) {
    const realCount = state.powerups[id] || 0;
    
    // Проверяем: режим Аркада, предмет есть, и эффект еще НЕ активен
    if (state.currentMode === 'arcade' && realCount > 0) {
        // Проверяем через window.arcadeGame, не запущен ли уже этот эффект
        if (window.arcadeGame && window.arcadeGame.activePowerups && window.arcadeGame.activePowerups[id] <= 0) {
            
            // 1. Списываем 1 штуку
            state.powerups[id]--;
            
            // 2. Запускаем эффект в движке аркады
            window.arcadeGame.activatePowerupEffect(id);
            
            // 3. Обновляем всё
            updatePowerupsPanel();
            updateGlobalUI();
            saveData();
            
            tg?.HapticFeedback.notificationOccurred('success');
        }
    } else if (realCount === 0) {
        tg?.HapticFeedback.notificationOccurred('error');
    }
}
window.activateAbility = activateAbility;
/* ---------------------------------------------------------
   5. НАВИГАЦИЯ (showRoom)
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем все сцены через добавление класса .hidden
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    
    // Показываем целевую сцену
    const target = scenes[roomName];
    if (!target) return console.error(`Ошибка: Сцена "${roomName}" не найдена!`);
    target.classList.remove('hidden');

    // Настройка Хедера (Баланс виден везде, кроме самой игры и оверлеев)
    const header = document.getElementById('header');
    if (header) {
        const isGameUI = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = isGameUI ? 'none' : 'flex';
    }
     /*
    const topBtn = document.getElementById('top-btn');
    const dailyBtn = document.getElementById('daily-btn');
    const isGameActive = ['game', 'pauseMenu', 'gameOver'].includes(roomName);

    if (topBtn) isGameActive ? topBtn.classList.add('hidden') : topBtn.classList.remove('hidden');
    if (dailyBtn) isGameActive ? dailyBtn.classList.add('hidden') : dailyBtn.classList.remove('hidden');
     */
    
    // Кнопка Паузы (только внутри геймплея)
    const pauseBtn = document.getElementById('btn-pause-trigger');
    if (pauseBtn) pauseBtn.classList.toggle('hidden', roomName !== 'game');

    // Нижняя навигационная панель (Скрываем в игре и экранах выбора)
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu'].includes(roomName);
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    // Логика запуска игровых движков
    // Логика запуска игровых движков
    if (roomName === 'game') {
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;

        const isClassic = state.currentMode === 'classic';
        const arcadeUI = document.querySelector('.ingame-ui-left') || document.getElementById('ingame-inventory');
        
        if (arcadeUI) {
            arcadeUI.style.display = isClassic ? 'none' : 'flex';
            // ОБНОВЛЯЕМ ПАНЕЛЬ ПЕРЕД СТАРТОМ
            if (!isClassic) {
                updatePowerupsPanel(); 
            }
        }

        const engine = isClassic ? window.game : window.arcadeGame;
        if (engine) {
            engine.resize(); 
            engine.start(); 
        }
    }

    // Инициализация контента комнат
    setTimeout(() => {
        try {
            switch(roomName) {
                case 'shop': initShop(); break;
                case 'inventory': initInventory(); break;
                case 'friends': initFriends(); break;
                case 'daily': initDaily(); break;
                case 'leaderboard': initLeaderboard(); break;
                case 'settings': initSettings(); break;
            }
            updateGlobalUI(); 
        } catch (e) { console.error(`Ошибка комнаты ${roomName}:`, e); }
    }, 10);
}
window.showRoom = showRoom;

/* ---------------------------------------------------------
   6. ИНИЦИАЛИЗАЦИЯ (init) - Запуск всего приложения
   --------------------------------------------------------- */
async function init() {
    if (tg) { tg.ready(); tg.expand(); }

    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }

    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet skip"); }

    // --- ОБРАБОТЧИК ПОКУПКИ (Исправляет buy_item) ---
    window.addEventListener('buy_item', async (e) => {
        const { id, price, type, powerupType } = e.detail;
        if (state.coins >= price) {
            state.coins -= price;
            if (type === 'powerup') {
                state.powerups[powerupType] = (state.powerups[powerupType] || 0) + 1;
            } else {
                if (!state.inventory.includes(id)) state.inventory.push(id);
            }
            tg?.HapticFeedback.notificationOccurred('success');
            updateGlobalUI();
            await saveData(); // Сохраняем после покупки
        } else {
            tg?.HapticFeedback.notificationOccurred('error');
            alert("Not enough coins!");
        }
    });

    // Универсальный хелпер для привязки кнопок к комнатам
    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            tg?.HapticFeedback.impactOccurred('light');
            showRoom(room);
        };
    };

    bind('btn-shop', 'shop');
    bind('btn-inventory', 'inventory');
    bind('btn-friends', 'friends');
    bind('btn-settings', 'settings');
    bind('btn-home-panel', 'home');
    bind('btn-start', 'modeSelection');
    bind('btn-back-to-home', 'home');
    bind('top-btn', 'leaderboard');
    bind('btn-top-icon', 'leaderboard');
    bind('daily-btn', 'daily');
    bind('btn-daily-icon', 'daily');

    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };

    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        pauseTrigger.onclick = (e) => {
            e.preventDefault();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    const resBtn = document.getElementById('btn-resume');
    if (resBtn) resBtn.onclick = () => showRoom('game');
    const exitBtn = document.getElementById('btn-exit-home');
    if (exitBtn) exitBtn.onclick = () => showRoom('home');
   

    // Логика возрождения
    const reviveBtn = document.getElementById('btn-revive');
    if (reviveBtn) {
        reviveBtn.onclick = (e) => {
            e.preventDefault();
            if (state.powerups.heart > 0) {
                state.powerups.heart--;
                updateGlobalUI();
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                engine.revive();
                showRoom('game');
                saveData();
            }
        };
    }

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.onclick = () => showRoom('game');
    const exitGO = document.getElementById('btn-exit-gameover');
    if (exitGO) exitGO.onclick = () => showRoom('home');

    // Загрузка данных игрока
    try {
        const auth = await api.authPlayer(tg?.initDataUnsafe?.start_param || "");
        if (auth?.user) {
            state.user = auth.user;
            state.coins = auth.user.coins ?? state.coins;
            state.lives = auth.user.lives ?? state.lives;
            state.crystals = auth.user.crystals ?? state.crystals;
            state.inventory = auth.user.inventory ?? [];

            if (!state.user.daily_challenges) {
                state.user.daily_challenges = [
                    { id: 1, text: "Fly through 10 pipes", target: 10, progress: 0, done: false },
                    { id: 2, text: "Collect 50 coins", target: 50, progress: 0, done: false },
                    { id: 3, text: "Use 1 ability", target: 1, progress: 0, done: false }
                ];
            }

            if (auth.user.powerups) {
                state.powerups = { ...state.powerups, ...auth.user.powerups };
            }
        }
    } catch (e) { 
        console.error("Ошибка загрузки:", e);
        state.user = { daily_challenges: [
            { id: 1, target: 10, progress: 0, done: false },
            { id: 2, target: 50, progress: 0, done: false },
            { id: 3, target: 1, progress: 0, done: false }
        ]};
    }

    window.state = state;
    updateGlobalUI();
    showRoom('home'); 
}

/* ---------------------------------------------------------
   7. ОБРАБОТКА СМЕРТИ (GAME OVER)
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    
    const btnRev = document.getElementById('btn-revive');
    if (btnRev) {
        const canRev = !reviveUsed && state.powerups.heart > 0;
        btnRev.classList.toggle('hidden', !canRev);
        btnRev.innerHTML = `USE HEART ❤️ <br><small>(${state.powerups.heart} LEFT)</small>`;
    }
    
    saveData(); // Сохраняем собранные монеты
    api.saveScore(score).catch(e => console.log("Score not saved:", e));
}

/* ---------------------------------------------------------
   8. СИНХРОНИЗАЦИЯ ИНТЕРФЕЙСА (UI)
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // Обновляем монеты и кристаллы в хедере
    const cEl = document.getElementById('header-coins');
    if (cEl) cEl.innerText = Number(state.coins).toLocaleString();
    
      // ЭНЕРГИЯ (Бывшие кристаллы)
    const crEl = document.getElementById('header-crystals');
    if (crEl) {
        // Находим иконку рядом (span с классом icon) и меняем её
        const iconSpan = crEl.previousElementSibling;
        if (iconSpan) iconSpan.innerText = "⚡"; // Меняем 💎 на ⚡
        crEl.innerText = state.crystals;
    }

    // Обновляем жизни (сердечки)
    document.querySelectorAll('.stat-lives, #header-lives').forEach(el => {
        el.innerText = state.lives;
    });

    // Обновляем ВСЕ бейджи способностей (те, что в магазине и инвентаре)
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val > 3 ? "3+" : val;
        });
    });

    // Если мы в игре, обновляем игровую панель способностей
    if (scenes.game && !scenes.game.classList.contains('hidden')) {
        updatePowerupsPanel();
    }
}
window.updateGlobalUI = updateGlobalUI;
function updatePowerupsPanel() {
    const abilities = ['shield', 'gap', 'ghost', 'magnet'];
    
    abilities.forEach(id => {
        const slots = document.querySelectorAll(`[data-ability="${id}"]`);
        const realCount = state.powerups[id] || 0;

        slots.forEach(slot => {
            const countSpan = slot.querySelector('.count') || slot.querySelector('.badge');
            
            if (countSpan) {
                countSpan.innerText = realCount > 3 ? "3+" : realCount;
            }
            
            // Если 0 — кнопка тусклая и не нажимается
            if (realCount <= 0) {
                slot.style.opacity = "0.3";
                slot.style.filter = "grayscale(1)";
                slot.style.pointerEvents = "none";
            } else {
                slot.style.opacity = "1";
                slot.style.filter = "grayscale(0)";
                slot.style.pointerEvents = "auto";
            }
            
            // Навешиваем клик
            slot.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                activateAbility(id);
            };
        });
    });
}
window.updatePowerupsPanel = updatePowerupsPanel;
// Окончательный запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };