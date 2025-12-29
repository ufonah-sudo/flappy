/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * FINAL GOLD RELEASE: Идеальная синхронизация, изоляция режимов и защита от ошибок.
 */

// --- 1. ИМПОРТЫ МОДУЛЕЙ ---
import * as api from './api.js';           // API для общения с бэкендом
import { Game } from './game.js';          // Движок Классики
import { ArcadeGame } from './arcade.js';  // Движок Аркады
import { WalletManager } from './wallet.js'; // Управление кошельком TON

// Импорт логики для каждой комнаты (интерфейса)
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
   Хранит данные игрока. Доступно везде через window.state
   --------------------------------------------------------- */
const state = { 
    user: null, 
    coins: 0, 
    lives: 3, 
    crystals: 0,
    currentMode: 'classic', // Важный переключатель: 'classic' или 'arcade'
    settings: { sound: true, music: true },
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 }
};

/* ---------------------------------------------------------
   3. КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ (SCENES)
   Чтобы не искать их каждый раз при клике
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
   4. НАВИГАЦИЯ (showRoom)
   Главная функция переключения экранов
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // 1. Скрываем абсолютно ВСЕ экраны
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    // 2. Находим и показываем целевой экран
    const target = scenes[roomName];
    if (!target) return console.error(`Ошибка: Сцена "${roomName}" не найдена!`);
    target.classList.remove('hidden');

    // 3. Управление Хедером (Баланс)
    // Скрываем хедер только внутри игры и в меню паузы/смерти
    const header = document.getElementById('header');
    if (header) {
        const isGameMode = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = isGameMode ? 'none' : 'flex';
    }

    // 4. Управление кнопкой Паузы (видна только в игре)
    const pauseBtn = document.getElementById('btn-pause-trigger');
    if (pauseBtn) pauseBtn.classList.toggle('hidden', roomName !== 'game');

    // 5. Управление Нижним Меню (скрываем в игре и модалках)
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideMenu = ['game', 'gameOver', 'modeSelection', 'pauseMenu'].includes(roomName);
        bottomPanel.style.setProperty('display', hideMenu ? 'none' : 'flex', 'important');
    }

    // 6. Управление кнопками ТОП и ДЕЙЛИ (видны только на Главной)
    const topBtn = document.getElementById('top-btn');
    const dailyBtn = document.getElementById('daily-btn');
    if (topBtn) topBtn.style.display = (roomName === 'home') ? 'block' : 'none';
    if (dailyBtn) dailyBtn.style.display = (roomName === 'home') ? 'block' : 'none';

    // 7. ЛОГИКА ЗАПУСКА ИГРЫ (САМОЕ ВАЖНОЕ)
    if (roomName === 'game') {
        // Сначала принудительно останавливаем ОБА движка
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;

        // Определяем, какой режим выбран
        const isClassic = state.currentMode === 'classic';
        
        // Управление UI Способностей (Кнопка Щита)
        const arcadeUI = document.querySelector('.ingame-ui-left') || document.getElementById('ingame-inventory');
        if (arcadeUI) {
            // Если Классика -> СКРЫТЬ. Если Аркада -> ПОКАЗАТЬ.
            arcadeUI.style.display = isClassic ? 'none' : 'flex';
        }

        // Выбираем и запускаем нужный движок
        const engine = isClassic ? window.game : window.arcadeGame;
        if (engine) {
            engine.resize(); // Подгоняем размер
            engine.start();  // Запускаем цикл
        }
    } else if (roomName !== 'pauseMenu') {
        // Если мы вышли из игры в меню — останавливаем все расчеты
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // Подсветка кнопок выбора режима
    if (roomName === 'modeSelection') {
        document.getElementById('btn-mode-classic')?.classList.toggle('active', state.currentMode === 'classic');
        document.getElementById('btn-mode-arcade')?.classList.toggle('active', state.currentMode === 'arcade');
    }

    // 8. Инициализация контента внутри комнат (с задержкой для рендеринга)
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
            updateGlobalUI(); // Обновляем цифры после загрузки комнаты
        } catch (e) { 
            console.error(`Ошибка инициализации комнаты ${roomName}:`, e); 
        }
    }, 10);
}

// Делаем функцию глобальной для вызова из HTML
window.showRoom = showRoom;

/* ---------------------------------------------------------
   5. ИНИЦИАЛИЗАЦИЯ (init) - Точка входа
   --------------------------------------------------------- */
async function init() {
    // Настраиваем Telegram
    if (tg) { tg.ready(); tg.expand(); }

    // Создаем экземпляры игр
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        // Классика (без бонусов)
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        // Аркада (с бонусами)
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }

    // Подключаем кошелек
    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet skip"); }

    // --- ПРИВЯЗКА КНОПОК ---
    // Хелпер для безопасного клика
    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            tg?.HapticFeedback.impactOccurred('light');
            showRoom(room);
        };
    };

    // Основное меню
    bind('btn-shop', 'shop');
    bind('btn-inventory', 'inventory');
    bind('btn-friends', 'friends');
    bind('btn-settings', 'settings');
    bind('btn-home-panel', 'home');
    bind('btn-start', 'modeSelection');
    bind('btn-back-to-home', 'home');

    // Верхние кнопки (Учитываем оба варианта ID для надежности)
    bind('top-btn', 'leaderboard');      // Вариант 1 (CSS)
    bind('btn-top-icon', 'leaderboard'); // Вариант 2 (HTML)
    
    bind('daily-btn', 'daily');          // Вариант 1
    bind('btn-daily-icon', 'daily');     // Вариант 2

    // Выбор режима
    const setMode = (mode) => {
        state.currentMode = mode;
        tg?.HapticFeedback.impactOccurred('medium');
        showRoom('game');
    };
    
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => setMode('classic');
    
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => setMode('arcade');

    // Кнопка ПАУЗЫ
    document.getElementById('btn-pause-trigger').onclick = (e) => {
        e.preventDefault();
        // Ставим на паузу оба движка (на всякий случай)
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
        showRoom('pauseMenu');
    };

    // Кнопки в меню Паузы
    document.getElementById('btn-resume').onclick = () => showRoom('game');
    document.getElementById('btn-exit-home').onclick = () => showRoom('home');

    // --- ЛОГИКА ЩИТА (ТОЛЬКО АРКАДА) ---
    // Ищем кнопку по всем возможным ID
    const shieldBtn = document.getElementById('btn-use-shield') || document.getElementById('use-shield-btn');
    if (shieldBtn) {
        shieldBtn.onclick = (e) => {
            e.preventDefault(); 
            e.stopPropagation(); // Чтобы птица не прыгала
            
            // ГЛАВНАЯ ЗАЩИТА: Если не Аркада — выходим сразу
            if (state.currentMode !== 'arcade') return;

            // Логика активации
            if (state.powerups.shield > 0) {
                // Проверяем, не активен ли уже щит
                if (window.arcadeGame.activePowerups && !window.arcadeGame.activePowerups.shield) {
                    state.powerups.shield--; // Списываем
                    window.arcadeGame.activePowerups.shield = 420; // Активируем (время в кадрах)
                    tg?.HapticFeedback.notificationOccurred('success');
                    updateGlobalUI(); // Обновляем счетчик
                }
            }
        };
    }

    // --- ЛОГИКА ВОЗРОЖДЕНИЯ (СЕРДЦЕ) ---
    const reviveBtn = document.getElementById('btn-revive');
    if (reviveBtn) {
        reviveBtn.onclick = (e) => {
            e.preventDefault();
            if (state.powerups.heart > 0) {
                state.powerups.heart--;
                updateGlobalUI();
                
                // Определяем, кого возрождать
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                engine.revive(); // Вызываем метод возрождения движка
                showRoom('game');
            } else {
                tg?.HapticFeedback.notificationOccurred('error');
            }
        };
    }

    // Кнопки Game Over
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.onclick = () => showRoom('game'); // Рестарт
    
    const exitGO = document.getElementById('btn-exit-gameover');
    if (exitGO) exitGO.onclick = () => showRoom('home'); // Выход

    // --- ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ---
    try {
        const authData = await api.authPlayer(tg?.initDataUnsafe?.start_param || "");
        if (authData?.user) {
            state.coins = authData.user.coins ?? state.coins;
            state.lives = authData.user.lives ?? state.lives;
            state.crystals = authData.user.crystals ?? state.crystals;
            if (authData.user.powerups) {
                state.powerups = { ...state.powerups, ...authData.user.powerups };
            }
        }
    } catch (e) { console.error("API Error", e); }

    // Финальный запуск
    window.state = state;
    updateGlobalUI();
    showRoom('home');
}

/* ---------------------------------------------------------
   6. ОБРАБОТКА СМЕРТИ (GAME OVER)
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        // Показываем кнопку, только если не использовали сердце в этом раунде И есть сердца в запасе
        const canRevive = !reviveUsed && state.powerups.heart > 0;
        btnRevive.classList.toggle('hidden', !canRevive);
        btnRevive.innerHTML = `USE HEART ❤️ <br><small>(${state.powerups.heart} LEFT)</small>`;
    }
    
    api.saveScore(score).catch(e => console.log(e));
}

/* ---------------------------------------------------------
   7. СИНХРОНИЗАЦИЯ ИНТЕРФЕЙСА (UI)
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // 1. Баланс
    const coinEl = document.getElementById('header-coins');
    if (coinEl) coinEl.innerText = Number(state.coins).toLocaleString();
    const cryEl = document.getElementById('header-crystals');
    if (cryEl) cryEl.innerText = state.crystals;

    // 2. Жизни
    document.querySelectorAll('.stat-lives, #header-lives').forEach(el => {
        el.innerText = state.lives;
    });

    // 3. Инвентарь (обновляем все бейджи)
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val;
            // Если не щит в игре — скрываем при 0
            if (el.id !== 'shield-count') {
                el.classList.toggle('hidden', val <= 0);
            }
        });
    });

    // 4. Кнопка щита в игре (Визуал)
    const sBtn = document.getElementById('btn-use-shield') || document.getElementById('use-shield-btn');
    if (sBtn) {
        const count = state.powerups.shield;
        const countEl = document.getElementById('shield-count');
        if (countEl) countEl.innerText = count;
        
        const isArcade = state.currentMode === 'arcade';
        const hasItems = count > 0;

        // Если классика — она и так скрыта в showRoom, но тут добиваем прозрачностью
        sBtn.style.opacity = (hasItems && isArcade) ? "1" : "0.5";
        // Запрещаем клики на уровне CSS, если не аркада
        sBtn.style.pointerEvents = isArcade ? "auto" : "none";
    }
}

// Делаем доступной глобально
window.updateGlobalUI = updateGlobalUI;

// ЗАПУСК ПОСЛЕ ЗАГРУЗКИ DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };