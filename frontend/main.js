/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Архитектура: Event-driven (событийно-ориентированная)
 */

// Импорт внешних модулей: API для связи с сервером, движки игры и менеджер кошелька TON
import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js'; 
import { WalletManager } from './wallet.js';

// Импорт модулей инициализации конкретных экранов (комнат)
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

// Инициализация объекта Telegram WebApp для работы внутри мессенджера
const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   1. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   Центральное хранилище данных игрока в текущей сессии
   --------------------------------------------------------- */
const state = { 
    user: null,         // Данные профиля (id, username)
    coins: 0,           // Валюта (монеты)
    lives: 3,           // Попытки (жизни)
    crystals: 0,        // Премиум валюта
    currentMode: 'classic', // Активный режим: 'classic' или 'arcade'
    settings: {
        sound: true,    // Вкл/выкл звука
        music: true     // Вкл/выкл музыки
    },
    // Количество бонусов у игрока (синхронизируется с БД)
    powerups: {
        heart: 0,   
        shield: 0,  
        gap: 0,     
        magnet: 0,  
        ghost: 0    
    }
};

/* ---------------------------------------------------------
   2. СЛОВАРЬ СЦЕН (SCENES)
   Объект со ссылками на DOM-элементы всех экранов для быстрого доступа
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
   Функция управления видимостью экранов
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Switching to: ${roomName}`);
    
    // Перебор всех сцен: добавляем класс 'hidden', чтобы скрыть их
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    // Показываем целевую сцену, удаляя класс 'hidden'
    const target = scenes[roomName];
    if (!target) {
        console.error(`[Navigation] Error: Scene "${roomName}" not found!`);
        return;
    }
    target.classList.remove('hidden');

    // Хедер (баланс) виден везде, кроме самой игры и меню паузы/смерти
    const header = document.getElementById('header');
    if (header) {
        const hideHeader = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = hideHeader ? 'none' : 'flex';
    }

    // Кнопка вызова паузы видна только в процессе игры
    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        pauseTrigger.classList.toggle('hidden', roomName !== 'game');
    }

    // Нижняя панель навигации скрыта на игровых и технических экранах
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideOn = ['game', 'gameOver', 'modeSelection', 'pauseMenu'];
        bottomPanel.style.setProperty('display', hideOn.includes(roomName) ? 'none' : 'flex', 'important');
    }

    // Логика управления игровыми циклами (Engine Control)
    if (roomName === 'game') {
        // Выбираем, какой движок запускать на canvas
        const activeEngine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
        const inactiveEngine = state.currentMode === 'classic' ? window.arcadeGame : window.game;

        if (inactiveEngine) inactiveEngine.isRunning = false; // Страховка: гасим второй движок
        
        if (activeEngine) {
            activeEngine.resize();   // Подстройка размера под экран
            activeEngine.start();    // Запуск цикла update/draw
        }
        
        // Показываем UI способностей (кнопка щита), если это Аркада
        const ingamePowerups = document.querySelector('.ingame-ui-left');
        if (ingamePowerups) {
            ingamePowerups.classList.toggle('hidden', state.currentMode === 'classic');
        }
    } else if (roomName !== 'pauseMenu') {
        // Если мы не в игре и не на паузе — полностью останавливаем все расчеты
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // Подсветка кнопок выбора режима (добавляем класс active)
    if (roomName === 'modeSelection') {
        document.getElementById('btn-mode-classic')?.classList.toggle('active', state.currentMode === 'classic');
        document.getElementById('btn-mode-arcade')?.classList.toggle('active', state.currentMode === 'arcade');
    }

    // Инициализация данных внутри комнат (Магазин, Лидерборд и т.д.)
    // Используем setTimeout, чтобы DOM успел обновиться до выполнения JS
    setTimeout(() => {
        try {
            switch(roomName) {
                case 'shop':      initShop(); break;
                case 'inventory': initInventory(); break;
                case 'friends':   initFriends(); break;
                case 'daily':     initDaily(); break;       
                case 'leaderboard': initLeaderboard(); break; 
                case 'settings':  initSettings(); break;
            }
            updateGlobalUI(); // Обновляем счетчики после загрузки комнаты
        } catch (err) { 
            console.error(`[RoomInit] Fail in ${roomName}:`, err); 
        }
    }, 10);
}

// Делаем функцию доступной для инлайновых обработчиков в HTML (onclick="showRoom(...)")
window.showRoom = showRoom;

/* ---------------------------------------------------------
   4. ГЛАВНАЯ ИНИЦИАЛИЗАЦИЯ (init)
   Запускается один раз при старте приложения
   --------------------------------------------------------- */
async function init() {
    // Настройка Telegram: подтверждаем готовность и разворачиваем на весь экран
    if (tg) {
        tg.ready();
        tg.expand(); 
    }

    // Инициализация Canvas и создание двух независимых экземпляров игры
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        // Передаем callback handleGameOver, чтобы движки могли сообщать о смерти птицы
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }

    // Инициализация кошелька TON
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Connection status changed:", isConnected);
        });
    } catch (e) { console.error("[TON] Initialization error:", e); }
    
    // Хелпер для быстрой привязки кликов к кнопкам навигации
    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { 
            e.preventDefault();
            tg?.HapticFeedback.impactOccurred('light'); // Виброотклик Telegram
            showRoom(room); 
        };
    };

    // Привязка кнопок главного меню
    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-top-icon', 'leaderboard');
    bindClick('btn-daily-icon', 'daily');
    bindClick('btn-start', 'modeSelection');
    bindClick('btn-back-to-home', 'home');

    // Кнопки выбора игрового режима
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { 
        state.currentMode = 'classic'; 
        tg?.HapticFeedback.impactOccurred('medium');
        showRoom('game');
    };

    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { 
        state.currentMode = 'arcade'; 
        tg?.HapticFeedback.impactOccurred('medium');
        showRoom('game');
    };

    // Управление паузой
    const pauseBtn = document.getElementById('btn-pause-trigger');
    if (pauseBtn) {
        pauseBtn.onclick = (e) => {
            e.preventDefault();
            // Останавливаем расчеты в движках
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    // Кнопки внутри меню паузы
    document.getElementById('btn-resume').onclick = () => showRoom('game');
    document.getElementById('btn-exit-home').onclick = () => showRoom('home');

    // Логика кнопки "Щит" внутри игры (только Аркада)
    const btnShieldInGame = document.getElementById('btn-use-shield');
    if (btnShieldInGame) {
        btnShieldInGame.onclick = (e) => {
            e.preventDefault(); e.stopPropagation(); // Предотвращаем прыжок птицы при клике на UI
            if (state.powerups.shield > 0 && state.currentMode === 'arcade') {
                // Если щит еще не активен — включаем его
                if (window.arcadeGame.activePowerups && !window.arcadeGame.activePowerups.shield) {
                    state.powerups.shield--;
                    window.arcadeGame.activePowerups.shield = 420; // ~7 секунд защиты
                    tg?.HapticFeedback.notificationOccurred('success');
                    updateGlobalUI(); // Обновляем счетчик на кнопке
                }
            }
        };
    }

    // Логика возрождения (Кнопка "Heart" на экране Game Over)
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = () => {
            if (state.powerups.heart > 0) {
                state.powerups.heart--; 
                updateGlobalUI();
                // Вызываем метод revive() у текущего активного движка
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                engine.revive(); 
                showRoom('game');
            }
        };
    }

    // Кнопки рестарта и выхода после проигрыша
    document.getElementById('btn-restart').onclick = () => showRoom('game');
    document.getElementById('btn-exit-gameover').onclick = () => showRoom('home');

    // Загрузка данных игрока с сервера через API
    try {
        // Отправляем start_param (для рефералов) и получаем данные профиля
        const authData = await api.authPlayer(tg?.initDataUnsafe?.start_param || ""); 
        if (authData?.user) {
            // Синхронизируем серверные данные с локальным состоянием
            state.coins = authData.user.coins ?? state.coins;
            state.lives = authData.user.lives ?? state.lives;
            state.crystals = authData.user.crystals ?? state.crystals;
            if (authData.user.powerups) {
                state.powerups = { ...state.powerups, ...authData.user.powerups };
            }
        }
    } catch (e) { console.error("[Auth] Initial load failed. Using local state.", e); }

    // Сохраняем состояние в window для доступа из других модулей (shop.js, inventory.js)
    window.state = state; 
    updateGlobalUI();
    showRoom('home'); // Стартуем с главного экрана
}

/* ---------------------------------------------------------
   5. ОБРАБОТКА GAME OVER
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    
    // Вывод финального счета на экран
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    // Управление доступностью кнопки возрождения
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        // Нельзя возродиться дважды за раунд или если нет сердец
        const canRevive = !reviveUsed && state.powerups.heart > 0;
        btnRevive.classList.toggle('hidden', !canRevive);
        btnRevive.innerHTML = `USE HEART ❤️ <br><small>(${state.powerups.heart} LEFT)</small>`;
    }
    
    // Сохранение рекорда на сервере
    api.saveScore(score).catch(e => console.error("[API] Score save error:", e));
}

/* ---------------------------------------------------------
   6. СИНХРОНИЗАЦИЯ ИНТЕРФЕЙСА (UI Update)
   Обновляет все визуальные счетчики на основе данных из state
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // Обновление баланса в хедере
    const coinEl = document.getElementById('header-coins');
    if (coinEl) coinEl.innerText = Number(state.coins).toLocaleString();
    
    const cryEl = document.getElementById('header-crystals');
    if (cryEl) cryEl.innerText = state.crystals;

    // Обновление жизней во всех местах (хедер и статистика)
    document.querySelectorAll('.stat-lives, #header-lives').forEach(el => {
        el.innerText = state.lives;
    });

    // Обновление бейджей (количества) для каждого бонуса в инвентаре и магазине
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        // Находим все элементы, привязанные к этому бонусу через data-атрибут
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val;
            // Скрываем бейдж, если предметов 0 (кроме кнопки щита в игре)
            if (el.id !== 'shield-count') {
                el.classList.toggle('hidden', val <= 0);
            }
        });
    });

    // Специальная обработка для кнопки щита внутри игры (в ArcadeMode)
    const shieldBtn = document.getElementById('btn-use-shield');
    if (shieldBtn) {
        const shieldCount = state.powerups.shield;
        const shieldCountEl = document.getElementById('shield-count');
        if (shieldCountEl) shieldCountEl.innerText = shieldCount;
        // Кнопка становится полупрозрачной, если щитов нет
        shieldBtn.style.opacity = shieldCount > 0 ? "1" : "0.5";
    }
}

// Глобальный доступ к функции обновления (для вызова из shop.js после покупки)
window.updateGlobalUI = updateGlobalUI;

/* ---------------------------------------------------------
   7. ТОЧКА ВХОДА
   --------------------------------------------------------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Экспорт для других JS-файлов
export { showRoom, state, updateGlobalUI };