/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Назначение: Импорты, Глобальный стейт, Навигация, Магазин и Синхронизация данных.
 * Версия: Финальная (Исправленная)
 */

// --- 1. ИМПОРТЫ МОДУЛЕЙ ---
import * as api from './api.js';           // Импортируем все функции из api.js для общения с сервером
import { Game } from './game.js';          // Импортируем движок Классического режима
import { ArcadeGame } from './arcade.js';  // Импортируем движок Аркадного режима
import { WalletManager } from './wallet.js'; // Импортируем менеджер кошелька TON

// Импорт функций для инициализации каждой комнаты (экрана)
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

// Инициализация объекта Telegram WebApp для доступа к данным пользователя
const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   Хранит все данные текущей сессии игры.
   --------------------------------------------------------- */
const state = { 
    user: null,                // Объект пользователя (id, username и т.д.)
    coins: 0,                  // Количество монет (🟡)
    lives: 5,                  // Энергия (⚡) для входа в игру
    crystals: 0,               // Кристаллы (💎) премиум валюта
    inventory: [],             // Массив купленных скинов или предметов
    currentMode: 'classic',    // Текущий выбранный режим ('classic' или 'arcade')
    settings: { sound: true, music: true }, // Настройки звука
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 } // Количество расходников (способностей)
};

/* ---------------------------------------------------------
   3. КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ (SCENES)
   Сохраняем ссылки на экраны, чтобы не искать их каждый раз.
   --------------------------------------------------------- */
const scenes = {
    home: document.getElementById('scene-home'),           // Главное меню
    modeSelection: document.getElementById('scene-mode-selection'), // Выбор режима
    game: document.getElementById('game-container'),       // Экран самой игры (Canvas)
    shop: document.getElementById('scene-shop'),           // Магазин
    leaderboard: document.getElementById('scene-leaderboard'), // Топ игроков
    friends: document.getElementById('scene-friends'),     // Друзья
    inventory: document.getElementById('scene-inventory'), // Инвентарь
    daily: document.getElementById('scene-daily'),         // Ежедневные награды
    settings: document.getElementById('scene-settings'),   // Настройки
    gameOver: document.getElementById('game-over'),        // Экран проигрыша
    pauseMenu: document.getElementById('pause-menu')       // Меню паузы
};

/* ---------------------------------------------------------
   4. ФУНКЦИИ СОХРАНЕНИЯ (Синхронизация)
   --------------------------------------------------------- */

// Функция для сохранения прогресса локально и на сервер
async function saveData() {
    // Сохраняем в LocalStorage браузера (быстрый доступ)
    localStorage.setItem('game_state', JSON.stringify({
        coins: state.coins,
        inventory: state.inventory,
        powerups: state.powerups
    }));
    
    // Пытаемся отправить данные на сервер (бэкенд)
    try {
        if (api.syncState) {
            // Вызываем API метод синхронизации
            await api.syncState(state);
            console.log("Данные синхронизированы!");
        }
    } catch (e) {
        // Если ошибка сети — просто логируем, игра не должна падать
        console.warn("Ошибка сохранения на сервер:", e);
    }
}
window.saveData = saveData; // Делаем функцию доступной глобально

// Функция активации способности (вызывается из UI игры)
async function activateAbility(id) {
    // Получаем текущее количество предметов этого типа
    const realCount = state.powerups[id] || 0;
    
    // Способности работают только в Аркаде и если предмет есть
    if (state.currentMode === 'arcade' && realCount > 0) {
        
        // Проверяем, не активна ли уже эта способность (чтобы не тратить зря)
        if (window.arcadeGame && window.arcadeGame.activePowerups && window.arcadeGame.activePowerups[id] <= 0) {
            
            // Списываем 1 предмет из стейта
            state.powerups[id]--;
            
            // Включаем эффект внутри игрового движка
            window.arcadeGame.activatePowerupEffect(id);
            
            // Обновляем интерфейс панелей и шапки
            updatePowerupsPanel();
            updateGlobalUI();
            
            // Сохраняем изменение количества
            saveData();
            
            // Вибрация об успехе
            tg?.HapticFeedback.notificationOccurred('success');
        }
    } else if (realCount === 0) {
        // Если предметов нет — вибрация об ошибке
        tg?.HapticFeedback.notificationOccurred('error');
    }
}
window.activateAbility = activateAbility; // Делаем доступной глобально

/* ---------------------------------------------------------
   5. НАВИГАЦИЯ (showRoom)
   Переключает видимость экранов и управляет элементами UI.
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем абсолютно все сцены (добавляем класс .hidden)
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    
    // Находим целевую сцену по имени
    const target = scenes[roomName];
    // Если сцена не найдена — ошибка в консоль
    if (!target) return console.error(`Ошибка: Сцена "${roomName}" не найдена!`);
    
    // Показываем целевую сцену (убираем класс .hidden)
    target.classList.remove('hidden');

    // Управление Хедером (Баланс виден везде, КРОМЕ игры, паузы и геймовера)
       // Хедер
    const header = document.getElementById('header');
    if (header) {
        // Всегда показываем хедер (flex), кроме экрана загрузки (если он есть)
        header.style.display = 'flex';
    }


        // Кнопка Паузы
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        if (roomName === 'game') {
            pauseBtn.style.display = 'block';
        } else {
            pauseBtn.style.display = 'none';
        }
    }

    // Управление Нижней Панелью Меню (Скрыта в игре и некоторых экранах)
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu'].includes(roomName);
        // Используем setProperty important, чтобы перебить стили CSS если нужно
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    // ЛОГИКА ЗАПУСКА ИГРЫ (Если перешли в room 'game')
    if (roomName === 'game') {
        // Останавливаем оба движка перед стартом (на всякий случай)
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
        
        const isClassic = state.currentMode === 'classic';
        
        // Находим панель способностей (слева внизу)
        const arcadeUI = document.querySelector('.ingame-ui-left') || document.getElementById('ingame-inventory');
        
        if (arcadeUI) {
            // Показываем панель только в Аркаде
            arcadeUI.style.display = isClassic ? 'none' : 'flex';
            // Если Аркада — обновляем количество предметов на кнопках
            if (!isClassic) {
                updatePowerupsPanel(); 
            }
        }
        
        // Выбираем нужный движок и запускаем
        const engine = isClassic ? window.game : window.arcadeGame;
        if (engine) {
            engine.resize(); // Подстраиваем под размер экрана
            engine.start();  // Старт игры
        }
    }

    // ЛОГИКА ИНИЦИАЛИЗАЦИИ КОМНАТ (Магазин, Лидерборд и т.д.)
    // Делаем небольшую задержку (10мс), чтобы DOM успел обновиться
    setTimeout(() => {
        try {
            switch(roomName) {
                case 'shop': initShop(); break;           // Загрузка магазина
                case 'inventory': initInventory(); break; // Загрузка инвентаря
                case 'friends': initFriends(); break;     // Загрузка друзей
                case 'daily': initDaily(); break;         // Загрузка дейли
                case 'leaderboard': initLeaderboard(); break; // Загрузка топа
                case 'settings': initSettings(); break;   // Загрузка настроек
            }
            updateGlobalUI(); // Обновляем цифры валют
        } catch (e) { console.error(`Ошибка инициализации комнаты ${roomName}:`, e); }
    }, 10);
}
window.showRoom = showRoom; // Делаем доступной глобально

/* ---------------------------------------------------------
   6. ИНИЦИАЛИЗАЦИЯ (init) - Точка входа
   --------------------------------------------------------- */
async function init() {
    // Сообщаем Telegram, что приложение готово
    if (tg) { tg.ready(); tg.expand(); }
    
    // Создаем экземпляры игр, передавая canvas и функцию Game Over
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
    }
    
    // Пытаемся инициализировать кошелек
    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet skip"); }

    // --- СЛУШАТЕЛЬ ГЛОБАЛЬНОГО СОБЫТИЯ ПОКУПКИ ---
    // (Срабатывает, когда в shop.js покупают что-то за монеты)
    window.addEventListener('buy_item', async (e) => {
        const { id, price, type, powerupType } = e.detail;
        
        // Проверяем баланс
        if (state.coins >= price) {
            state.coins -= price; // Списываем монеты
            
            if (type === 'powerup') {
                // Если купили расходник - увеличиваем счетчик
                state.powerups[powerupType] = (state.powerups[powerupType] || 0) + 1;
            } else {
                // Если купили скин - добавляем в инвентарь (если нет)
                if (!state.inventory.includes(id)) state.inventory.push(id);
            }
            
            tg?.HapticFeedback.notificationOccurred('success');
            updateGlobalUI(); // Обновляем UI
            await saveData(); // Сохраняем
        } else {
            // Ошибка, если монет не хватило (на всякий случай)
            tg?.HapticFeedback.notificationOccurred('error');
            alert("Not enough coins!");
        }
    });

    // --- ПРИВЯЗКА КЛИКОВ ПО КНОПКАМ МЕНЮ ---
    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            tg?.HapticFeedback.impactOccurred('light'); // Вибрация
            showRoom(room); // Переход
        };
    };
    
    // Привязываем основные кнопки навигации
    bind('btn-shop', 'shop');
    bind('btn-inventory', 'inventory');
    bind('btn-friends', 'friends');
    bind('btn-settings', 'settings');
    bind('btn-home-panel', 'home');
    bind('btn-back-to-home', 'home');
    
    // Кнопки на главном экране
    bind('btn-start', 'modeSelection');
    bind('top-btn', 'leaderboard');
    bind('daily-btn', 'daily');

    // Кнопки выбора режима
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };

    // Кнопка Паузы (в игре)
    const pauseTrigger = document.getElementById('pause-btn'); // ID совпадает с HTML
    if (pauseTrigger) {
        pauseTrigger.onclick = (e) => {
            e.preventDefault();
            // Ставим на паузу оба движка
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    // Кнопки внутри Паузы
    const resBtn = document.getElementById('btn-resume');
    if (resBtn) resBtn.onclick = () => showRoom('game');
    
    const exitBtn = document.getElementById('btn-exit-home');
    if (exitBtn) exitBtn.onclick = () => showRoom('home');
    
    // Кнопка Возрождения (Heart)
    const reviveBtn = document.getElementById('btn-revive');
    if (reviveBtn) {
        reviveBtn.onclick = (e) => {
            e.preventDefault();
            // Проверяем наличие Сердечка (способность)
            if (state.powerups.heart > 0) {
                state.powerups.heart--; // Списываем
                updateGlobalUI();
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                engine.revive(); // Оживляем птицу
                showRoom('game'); // Возвращаемся в игру
                saveData();
            }
        };
    }
    
    // Кнопки Game Over
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.onclick = () => showRoom('game');
    
    const exitGO = document.getElementById('btn-exit-gameover');
    if (exitGO) exitGO.onclick = () => showRoom('home');

    // --- ЗАГРУЗКА ДАННЫХ ИГРОКА С СЕРВЕРА ---
    try {
        // Передаем start_param (для рефералов)
        const auth = await api.authPlayer(tg?.initDataUnsafe?.start_param || "");
        
        if (auth?.user) {
            state.user = auth.user;
            state.coins = auth.user.coins ?? state.coins;
            state.lives = auth.user.lives ?? state.lives; // Загружаем Энергию
            state.crystals = auth.user.crystals ?? state.crystals; // Загружаем Кристаллы
            state.inventory = auth.user.inventory ?? [];
            
            // Если ежедневные задания не пришли с сервера — ставим дефолтные
            if (!state.user.daily_challenges) {
                state.user.daily_challenges = [
                    { id: 1, text: "Fly through 10 pipes", target: 10, progress: 0, done: false },
                    { id: 2, text: "Collect 50 coins", target: 50, progress: 0, done: false },
                    { id: 3, text: "Use 1 ability", target: 1, progress: 0, done: false }
                ];
            }
            
            // Загружаем способности
            if (auth.user.powerups) {
                state.powerups = { ...state.powerups, ...auth.user.powerups };
            }
        }
    } catch (e) { 
        console.error("Ошибка загрузки профиля:", e);
    }

    // Финальное обновление UI и показ дома
    window.state = state;
    updateGlobalUI();
    showRoom('home'); 
}

/* ---------------------------------------------------------
   7. ОБРАБОТКА СМЕРТИ (GAME OVER)
   --------------------------------------------------------- */
/* --- GAME OVER --- */
/* --- GAME OVER --- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    
    // Счет
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    
    // Кнопка Revive
    const btnRev = document.getElementById('btn-revive');
    const revCount = document.getElementById('revive-count'); 
    
    if (btnRev) {
        // Условие: не карьера, не использовали, есть сердца
        const canRev = state.currentMode !== 'career' && !reviveUsed && state.powerups.heart > 0;
        const heartsLeft = state.powerups.heart || 0;

        // Обновляем текст (0)
        if (revCount) revCount.innerText = `(${heartsLeft})`;

        if (canRev) {
            // АКТИВНА
            btnRev.disabled = false;
            btnRev.style.opacity = "1";
            btnRev.style.filter = "none";
            btnRev.style.cursor = "pointer";
        } else {
            // НЕАКТИВНА (Серая)
            btnRev.disabled = true;
            btnRev.style.opacity = "0.5";
            btnRev.style.filter = "grayscale(1)";
            btnRev.style.cursor = "not-allowed";
        }
    }
    
    saveData();
    if(state.currentMode !== 'career') api.saveScore(score).catch(e => console.log("Score not saved:", e));
}


/* ---------------------------------------------------------
   8. СИНХРОНИЗАЦИЯ ИНТЕРФЕЙСА (UI)
   Обновляет все счетчики (Энергия, Монеты, Кристаллы)
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // 1. ЭНЕРГИЯ (lives) -> Ищем элемент с ID header-energy
    // Иконка ⚡ уже прописана в HTML, просто меняем цифру
    const enEl = document.getElementById('header-energy');
    if (enEl) enEl.innerText = state.lives;

    // 2. МОНЕТЫ (coins) -> Ищем header-coins
    // Иконка 🟡 уже в HTML
    const cEl = document.getElementById('header-coins');
    if (cEl) cEl.innerText = Number(state.coins).toLocaleString();
    
    // 3. КРИСТАЛЛЫ (crystals) -> Ищем header-crystals
    // Иконка 💎 уже в HTML
    const crEl = document.getElementById('header-crystals');
    if (crEl) crEl.innerText = state.crystals;

    // Обновляем бейджи способностей (В инвентаре, магазине, игре)
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        // Ищем все элементы с атрибутом data-powerup="shield" и т.д.
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val > 3 ? "3+" : val;
        });
    });

    // Если игра сейчас идет (не скрыта), обновляем игровую панель
    if (scenes.game && !scenes.game.classList.contains('hidden')) {
        updatePowerupsPanel();
    }
}
window.updateGlobalUI = updateGlobalUI;

// Функция обновления кнопок способностей внутри игры (Аркада)
function updatePowerupsPanel() {
    const abilities = ['shield', 'gap', 'ghost', 'magnet'];
    
    abilities.forEach(id => {
        // Находим кнопки способностей
        const slots = document.querySelectorAll(`[data-ability="${id}"]`);
        const realCount = state.powerups[id] || 0;
        
        slots.forEach(slot => {
            // Обновляем бейдж с цифрой
            const countSpan = slot.querySelector('.count') || slot.querySelector('.badge');
            if (countSpan) {
                countSpan.innerText = realCount > 3 ? "3+" : realCount;
            }
            
            // Если предметов 0 — делаем кнопку полупрозрачной и неактивной
            if (realCount <= 0) {
                slot.style.opacity = "0.3";
                slot.style.filter = "grayscale(1)";
                slot.style.pointerEvents = "none";
            } else {
                slot.style.opacity = "1";
                slot.style.filter = "grayscale(0)";
                slot.style.pointerEvents = "auto";
            }
            
            // Вешаем клик для активации
            slot.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                activateAbility(id);
            };
        });
    });
}
window.updatePowerupsPanel = updatePowerupsPanel;

// Запуск при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Экспорт для использования в других модулях
export { showRoom, state, updateGlobalUI };