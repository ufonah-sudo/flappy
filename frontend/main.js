/* ==========================================================================
   ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
   Управляет навигацией, инициализацией движков и синхронизацией с Telegram
   ========================================================================== */

import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js'; 
import { WalletManager } from './wallet.js';

// Импорты инициализации логики для каждой комнаты
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   1. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   Хранит данные пользователя и инвентарь на текущую сессию
   --------------------------------------------------------- */
const state = { 
    user: null, 
    coins: 0, 
    lives: 3, 
    crystals: 1,
    currentMode: 'classic', // 'classic' или 'arcade'
    settings: {
        sound: true,
        music: true
    },
    powerups: {
        heart: 3,   // Жизни для возрождения
        shield: 3,  // Защита от одного удара
        gap: 3,     // Увеличенные проемы труб
        magnet: 3,  // Притяжение монет
        ghost: 3    // Пролет сквозь трубы
    }
};

/* ---------------------------------------------------------
   2. СЛОВАРЬ СЦЕН (SCENES)
   Сопоставляет названия комнат с их DOM-элементами
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
   3. НАВИГАЦИЯ (showRoom)
   Основная функция переключения экранов и управления UI-панелями
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем абсолютно все экраны
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    const target = scenes[roomName];
    if (!target) return;
    target.classList.remove('hidden');

    // Управление Верхней панелью (Баланс): скрываем в самой игре и на экранах смерти/паузы
    const header = document.getElementById('header');
    if (header) {
        header.style.display = (roomName === 'game' || roomName === 'pauseMenu' || roomName === 'gameOver') ? 'none' : 'flex';
    }

    // Управление кнопкой ПАУЗА (видна только в процессе игры)
    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        pauseTrigger.classList.toggle('hidden', roomName !== 'game');
    }

    // Управление Нижней панелью (Меню): скрываем в игре и системных меню игры
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideOn = ['game', 'gameOver', 'modeSelection', 'pauseMenu'];
        if (hideOn.includes(roomName)) {
            bottomPanel.style.setProperty('display', 'none', 'important');
        } else {
            bottomPanel.style.setProperty('display', 'flex', 'important');
        }
    }

    // Запуск или остановка игровых движков
    if (roomName === 'game') {
        // Выбираем движок в зависимости от режима
        const activeEngine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
        if (activeEngine) {
            activeEngine.resize();
            activeEngine.isRunning = true;
            activeEngine.start(); 
        }
        
        // Показываем кнопки способностей в игре, если это Аркада
        const ingamePowerups = document.querySelector('.ingame-ui-left');
        if (ingamePowerups) {
            ingamePowerups.classList.toggle('hidden', state.currentMode === 'classic');
        }
    } else if (roomName !== 'pauseMenu') {
        // Полная остановка всех движков при выходе в меню
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // Инициализация логики конкретной комнаты при входе
    try {
        switch(roomName) {
            case 'shop':      initShop(); break;
            case 'inventory': initInventory(); break;
            case 'friends':   initFriends(); break;
            case 'daily':     initDaily(); break;
            case 'leaderboard': initLeaderboard(); break;
            case 'settings':  initSettings(); break;
        }
        updateGlobalUI(); 
    } catch (err) { console.error(`[RoomInit] Ошибка инициализации ${roomName}:`, err); }
}

// Пробрасываем функцию в window, чтобы вызывать из HTML (через onclick)
window.showRoom = showRoom;

/* ---------------------------------------------------------
   4. ИНИЦИАЛИЗАЦИЯ (init)
   Выполняется один раз при старте приложения
   --------------------------------------------------------- */
async function init() {
    if (tg) {
        tg.ready();
        tg.expand(); 
    }

    // Подключение кошелька TON
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус:", isConnected ? "Connected" : "Disconnected");
        });
    } catch (e) { console.error("[TON] Ошибка кошелька:", e); }
    
    // Создание экземпляров игры
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
        window.arcadeGame = new ArcadeGame(canvas, handleGameOver);
    }

    // Функция-помощник для привязки кнопок навигации
    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { 
            e.preventDefault();
            tg?.HapticFeedback.impactOccurred('light');
            showRoom(room); 
        };
    };

    /* --- Привязка навигации --- */
    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-top-icon', 'leaderboard'); // Кнопка КУБОК на главном экране
    bindClick('btn-daily-icon', 'daily');     // Кнопка КАЛЕНДАРЬ на главном экране
    bindClick('btn-start', 'modeSelection');

    /* --- Выбор режимов --- */
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { 
        tg?.HapticFeedback.impactOccurred('medium');
        state.currentMode = 'classic'; 
        showRoom('game'); 
    };

    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { 
        tg?.HapticFeedback.impactOccurred('medium');
        state.currentMode = 'arcade'; 
        showRoom('game'); 
    };
    
    bindClick('btn-back-to-home', 'home');

    /* --- Пауза и управление в игре --- */
    const btnPause = document.getElementById('btn-pause-trigger');
    if (btnPause) {
        btnPause.onclick = () => {
            tg?.HapticFeedback.selectionChanged();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.onclick = () => {
        tg?.HapticFeedback.impactOccurred('light');
        showRoom('game');
    }

    const btnExit = document.getElementById('btn-exit-home');
    if (btnExit) btnExit.onclick = () => showRoom('home');

    /* --- Логика ИСПОЛЬЗОВАНИЯ способностей в игре (Arcade) --- */
    const btnShieldInGame = document.getElementById('btn-use-shield');
    if (btnShieldInGame) {
        btnShieldInGame.onclick = (e) => {
            e.stopPropagation(); // Чтобы не было прыжка при нажатии на кнопку
            if (state.powerups.shield > 0 && state.currentMode === 'arcade') {
                if (!window.arcadeGame.shieldActive) {
                    state.powerups.shield--;
                    window.arcadeGame.shieldActive = true;
                    tg?.HapticFeedback.notificationOccurred('success');
                    updateGlobalUI();
                }
            }
        };
    }

    /* --- Экран Смерти (Game Over) --- */
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = () => {
            if (state.powerups.heart > 0) {
                tg?.HapticFeedback.notificationOccurred('success');
                state.powerups.heart--; 
                updateGlobalUI();
                showRoom('game');
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                if (engine) engine.revive(); 
            } else {
                tg?.HapticFeedback.notificationOccurred('error');
            }
        };
    }

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
        btnRestart.onclick = () => {
            tg?.HapticFeedback.impactOccurred('medium');
            showRoom('game');
        }
    }

    /* --- Загрузка данных игрока из API --- */
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        if (authData?.user) {
            Object.assign(state, {
                user: authData.user,
                coins: authData.user.coins ?? state.coins,
                lives: authData.user.lives ?? state.lives,
                crystals: authData.user.crystals ?? state.crystals
            });
            if (authData.user.powerups) state.powerups = { ...state.powerups, ...authData.user.powerups };
        }
    } catch (e) { console.error("[Auth] Ошибка загрузки:", e); }

    // Сохраняем состояние в window для отладки
    window.state = state; 
    updateGlobalUI();
    showRoom('home'); // Стартуем с главного экрана
}

/* ---------------------------------------------------------
   5. ОБРАБОТКА ОКОНЧАНИЯ ИГРЫ
   Вызывается движком (game.js / arcade.js), когда игрок упал
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        // Прячем возрождение, если оно уже использовано в этом раунде
        btnRevive.style.display = reviveUsed ? 'none' : 'block';
        btnRevive.innerHTML = `USE HEART ❤️ <br><small>(Left: ${state.powerups.heart})</small>`;
        btnRevive.style.opacity = state.powerups.heart > 0 ? "1" : "0.5";
    }
    
    // Сохраняем результат на сервер
    api.saveScore(score).catch(err => console.error("[Score] Ошибка сохранения:", err));
}

/* ---------------------------------------------------------
   6. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА (UI)
   Синхронизирует данные из state с элементами на экране
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    const coinValue = Number(state.coins).toLocaleString();
    const crystalValue = Number(state.crystals).toLocaleString();
    
    const setInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    // Обновляем баланс в хедере
    setInner('header-coins', coinValue);
    setInner('header-crystals', crystalValue);

    // Обновляем жизни и кристаллы в статистике
    document.querySelectorAll('.stat-lives, #header-lives, #revive-lives-count').forEach(el => {
        el.innerText = state.lives;
    });

    document.querySelectorAll('.stat-crystals').forEach(el => {
        el.innerText = state.crystals;
    });

    // Обновляем баджи (цифры) у способностей
    if (state.powerups) {
        Object.keys(state.powerups).forEach(key => {
            // Ищем все элементы с атрибутом data-powerup="имя_способности"
            const badges = document.querySelectorAll(`.item-badge[data-powerup="${key}"], .powerup-count-${key}`);
            badges.forEach(badge => {
                badge.innerText = state.powerups[key];
                // Прячем цифру, если предметов 0 (кроме комнаты инвентаря)
                if (state.powerups[key] <= 0) {
                    badge.classList.add('hidden');
                } else {
                    badge.classList.remove('hidden');
                }
            });
        });
    }
}

/* ---------------------------------------------------------
   7. СТАРТ ПРИЛОЖЕНИЯ
   --------------------------------------------------------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Экспорт для других модулей
export { showRoom, state, updateGlobalUI };