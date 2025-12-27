/* ==========================================================================
   ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
   Отвечает за:
   1. Навигацию между экранами (showRoom)
   2. Связь интерфейса с игровыми движками (Game/ArcadeGame)
   3. Работу с Telegram API и сохранение данных
   ========================================================================== */

import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js'; 
import { WalletManager } from './wallet.js';

// Подключаем скрипты для управления содержимым комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   1. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   В этом объекте хранится вся текущая информация об игроке.
   Она обновляется при старте (из базы) и в процессе игры.
   --------------------------------------------------------- */
const state = { 
    user: null, 
    coins: 0, 
    lives: 3, 
    crystals: 1,
    currentMode: 'classic', // Текущий режим: 'classic' или 'arcade'
    settings: {
        sound: true,
        music: true
    },
    // Инвентарь способностей (синхронизируется с сервером)
    powerups: {
        heart: 3,   
        shield: 3,  
        gap: 3,     
        magnet: 3,  
        ghost: 3    
    }
};

/* ---------------------------------------------------------
   2. СЛОВАРЬ СЦЕН (SCENES)
   Кэшируем DOM-элементы, чтобы не искать их каждый раз при клике.
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
   Самая важная функция. Она скрывает все лишнее и показывает нужное.
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в комнату: ${roomName}`);
    
    // Шаг 1: Скрываем вообще ВСЕ экраны (добавляем класс .hidden)
    Object.values(scenes).forEach(scene => {
        if (scene) scene.classList.add('hidden');
    });
    
    // Шаг 2: Находим нужный экран и показываем его
    const target = scenes[roomName];
    if (!target) {
        console.error(`[Navigation] Ошибка: Сцена "${roomName}" не найдена в HTML!`);
        return;
    }
    target.classList.remove('hidden');

    // Шаг 3: Управление Хедером (Баланс монет)
    // Хедер скрывается, когда мы играем или в меню паузы/смерти
    const header = document.getElementById('header');
    if (header) {
        const hideHeader = ['game', 'pauseMenu', 'gameOver'].includes(roomName);
        header.style.display = hideHeader ? 'none' : 'flex';
    }

    // Шаг 4: Управление кнопкой Паузы
    const pauseTrigger = document.getElementById('btn-pause-trigger');
    if (pauseTrigger) {
        // Показываем кнопку паузы ТОЛЬКО если мы в игре ('game')
        pauseTrigger.classList.toggle('hidden', roomName !== 'game');
    }

    // Шаг 5: Управление Нижним Меню
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        // Список экранов, где нижнее меню НЕ нужно
        const hideOn = ['game', 'gameOver', 'modeSelection', 'pauseMenu'];
        if (hideOn.includes(roomName)) {
            bottomPanel.style.setProperty('display', 'none', 'important');
        } else {
            bottomPanel.style.setProperty('display', 'flex', 'important');
        }
    }

    // Шаг 6: Управление игровым движком (Game / ArcadeGame)
    if (roomName === 'game') {
        // Выбираем нужный класс игры в зависимости от режима
        const activeEngine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
        
        if (activeEngine) {
            // Передаем в движок актуальное количество предметов
            activeEngine.inventory = { ...state.powerups }; 
            
            // ВАЖНО: Инициализируем объект активных бонусов, чтобы Аркада не падала с ошибкой
            activeEngine.activePowerups = activeEngine.activePowerups || {};
            
            // Подгоняем размер под экран и запускаем
            activeEngine.resize();
            activeEngine.isRunning = true;
            activeEngine.start(); 
        }
        
        // Управление UI способностей (Щит слева внизу)
        const ingamePowerups = document.querySelector('.ingame-ui-left');
        if (ingamePowerups) {
            // Скрываем щит в Классике, показываем в Аркаде
            ingamePowerups.classList.toggle('hidden', state.currentMode === 'classic');
        }
    } else if (roomName !== 'pauseMenu') {
        // Если мы вышли из игры (не на паузу), останавливаем циклы отрисовки
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
    }

    // Подсветка выбранного режима на экране выбора
    if (roomName === 'modeSelection') {
        document.getElementById('btn-mode-classic')?.classList.toggle('active', state.currentMode === 'classic');
        document.getElementById('btn-mode-arcade')?.classList.toggle('active', state.currentMode === 'arcade');
    }

    // Шаг 7: Инициализация содержимого комнат (Списки, Магазин и т.д.)
    // ИСПОЛЬЗУЕМ setTimeout, чтобы браузер успел отрисовать div перед тем, как JS начнет в него писать.
    // Это исправляет баг "Дейли и Топ не работают".
    setTimeout(() => {
        try {
            switch(roomName) {
                case 'shop':      initShop(); break;
                case 'inventory': initInventory(); break;
                case 'friends':   initFriends(); break;
                case 'daily':     initDaily(); break;       // Исправлено: теперь запускается
                case 'leaderboard': initLeaderboard(); break; // Исправлено: теперь запускается
                case 'settings':  initSettings(); break;
            }
            updateGlobalUI(); 
        } catch (err) { 
            console.error(`[RoomInit] Ошибка инициализации комнаты ${roomName}:`, err); 
        }
    }, 10);
}

// Делаем функцию доступной глобально (для onclick в HTML)
window.showRoom = showRoom;

/* ---------------------------------------------------------
   4. ИНИЦИАЛИЗАЦИЯ (init)
   Запускается один раз при загрузке страницы
   --------------------------------------------------------- */
async function init() {
    // Сообщаем Телеграму, что приложение готово и разворачиваем его
    if (tg) {
        tg.ready();
        tg.expand(); 
    }

    // Подключение к TON (Wallet)
    try {
        window.wallet = new WalletManager((isConnected) => {
            console.log("[TON] Статус кошелька:", isConnected ? "Подключен" : "Отключен");
        });
    } catch (e) { console.error("[TON] Ошибка инициализации:", e); }
    
    // Создаем экземпляры игр (Классика и Аркада)
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, handleGameOver);
        window.arcadeGame = new ArcadeGame(canvas, handleGameOver);
    }

    // Функция-помощник для назначения кликов
    // Добавляет вибрацию и предотвращает "проваливание" клика
    const bindClick = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => { 
            e.preventDefault();
            e.stopPropagation(); // Важно: клик не идет дальше
            tg?.HapticFeedback.impactOccurred('light'); // Легкая вибрация
            showRoom(room); 
        };
    };

    /* --- Привязка кнопок меню --- */
    bindClick('btn-shop', 'shop');
    bindClick('btn-inventory', 'inventory');
    bindClick('btn-home-panel', 'home'); 
    bindClick('btn-friends', 'friends');
    bindClick('btn-settings', 'settings');
    bindClick('btn-top-icon', 'leaderboard'); // Кнопка Кубка (ТОП)
    bindClick('btn-daily-icon', 'daily');     // Кнопка Календаря (Дейли)
    bindClick('btn-start', 'modeSelection');  // Кнопка Play -> Выбор режима
    bindClick('btn-back-to-home', 'home');

    /* --- Выбор режимов (Classic / Arcade) --- */
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = (e) => { 
        e.stopPropagation();
        tg?.HapticFeedback.impactOccurred('medium');
        state.currentMode = 'classic'; 
        // Небольшая задержка для визуального эффекта нажатия
        setTimeout(() => showRoom('game'), 50);
    };

    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = (e) => { 
        e.stopPropagation();
        tg?.HapticFeedback.impactOccurred('medium');
        state.currentMode = 'arcade'; 
        setTimeout(() => showRoom('game'), 50);
    };

    /* --- Кнопка Паузы --- */
    const btnPause = document.getElementById('btn-pause-trigger');
    if (btnPause) {
        btnPause.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            tg?.HapticFeedback.selectionChanged();
            // Ставим игру на паузу
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    /* --- Кнопка "Продолжить" (Resume) --- */
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.onclick = (e) => {
        e.stopPropagation();
        tg?.HapticFeedback.impactOccurred('light');
        showRoom('game');
    }

    /* --- Кнопка "Выход" из паузы --- */
    const btnExit = document.getElementById('btn-exit-home');
    if (btnExit) btnExit.onclick = (e) => {
        e.stopPropagation();
        showRoom('home');
    }

    /* --- Использование ЩИТА внутри игры (только Аркада) --- */
    const btnShieldInGame = document.getElementById('btn-use-shield');
    if (btnShieldInGame) {
        btnShieldInGame.onclick = (e) => {
            e.preventDefault(); 
            e.stopPropagation(); // Чтобы птица не подпрыгнула при клике на кнопку
            
            // Проверяем: есть ли щиты, включена ли аркада, не активен ли уже щит
            if (state.powerups.shield > 0 && state.currentMode === 'arcade') {
                if (!window.arcadeGame.activePowerups?.shield) {
                    state.powerups.shield--; // Списываем 1 шт
                    
                    // Активируем в движке
                    window.arcadeGame.activePowerups = window.arcadeGame.activePowerups || {};
                    window.arcadeGame.activePowerups.shield = 400; // Таймер действия
                    
                    tg?.HapticFeedback.notificationOccurred('success');
                    updateGlobalUI(); // Обновляем цифру на кнопке
                }
            }
        };
    }

    /* --- Кнопка Возрождения (Heart) --- */
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        btnRevive.onclick = (e) => {
            e.stopPropagation();
            if (state.powerups.heart > 0) {
                tg?.HapticFeedback.notificationOccurred('success');
                state.powerups.heart--; 
                updateGlobalUI();
                showRoom('game');
                
                // Вызываем метод revive() у текущего движка
                const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                if (engine) engine.revive(); 
            } else {
                tg?.HapticFeedback.notificationOccurred('error');
            }
        };
    }

    /* --- Кнопка Рестарт (Game Over) --- */
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
        btnRestart.onclick = (e) => {
            e.stopPropagation();
            tg?.HapticFeedback.impactOccurred('medium');
            showRoom('game'); // Это перезапустит игру через activeEngine.start()
        }
    }

    const btnExitGameOver = document.getElementById('btn-exit-gameover');
    if (btnExitGameOver) {
        btnExitGameOver.onclick = () => showRoom('home');
    }

    /* --- Загрузка данных игрока с сервера --- */
    try {
        const startParam = tg?.initDataUnsafe?.start_param || "";
        const authData = await api.authPlayer(startParam); 
        if (authData?.user) {
            // Обновляем локальный стейт данными из базы
            Object.assign(state, {
                user: authData.user,
                coins: authData.user.coins ?? state.coins,
                lives: authData.user.lives ?? state.lives,
                crystals: authData.user.crystals ?? state.crystals
            });
            if (authData.user.powerups) {
                state.powerups = { ...state.powerups, ...authData.user.powerups };
            }
        }
    } catch (e) { 
        console.error("[Auth] Не удалось загрузить данные, используем локальные.", e); 
    }

    // Сохраняем стейт глобально для отладки
    window.state = state; 
    updateGlobalUI();
    showRoom('home'); // Показываем главный экран после загрузки
}

/* ---------------------------------------------------------
   5. ОБРАБОТКА СМЕРТИ
   Эту функцию вызывает игра, когда птица падает
   --------------------------------------------------------- */
function handleGameOver(score, reviveUsed) {
    showRoom('gameOver');
    
    // Обновляем счет
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    // Управление кнопкой возрождения
    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) {
        // Скрываем, если уже использовали сердце в этом раунде
        btnRevive.classList.toggle('hidden', reviveUsed || state.powerups.heart <= 0);
        
        // Обновляем текст (показываем остаток сердец)
        const heartCount = state.powerups.heart;
        btnRevive.innerHTML = `USE HEART ❤️ <br><small>(Available: ${heartCount})</small>`;
    }
    
    // Сохраняем рекорд
    api.saveScore(score).catch(err => console.error("[Score] Ошибка сохранения:", err));
}

/* ---------------------------------------------------------
   6. СИНХРОНИЗАЦИЯ UI
   Обновляет все счетчики (монеты, жизни, предметы) на экране
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // Вспомогательная функция для обновления текста
    const setInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    // Обновляем хедер
    setInner('header-coins', Number(state.coins).toLocaleString());
    setInner('header-crystals', Number(state.crystals).toLocaleString());

    // Обновляем жизни везде
    document.querySelectorAll('.stat-lives, #header-lives, #revive-lives-count').forEach(el => {
        el.innerText = state.lives;
    });

    // Обновляем инвентарь (бейджи)
    if (state.powerups) {
        Object.keys(state.powerups).forEach(key => {
            // Ищем бейджи в магазине, инвентаре и в игре
            const badges = document.querySelectorAll(
                `.item-badge[data-powerup="${key}"], 
                 .powerup-count-${key}, 
                 .badge[data-powerup="${key}"],
                 #shield-count` // Спец. ID для кнопки щита в игре
            );
            
            badges.forEach(badge => {
                badge.innerText = state.powerups[key];
                // Если предметов 0, скрываем бейдж (кроме кнопки в игре, она просто сереет)
                if (badge.id !== 'shield-count') {
                    badge.classList.toggle('hidden', state.powerups[key] <= 0);
                } else {
                    // Кнопку щита делаем полупрозрачной, если щитов 0
                    badge.parentElement.style.opacity = state.powerups[key] > 0 ? "1" : "0.5";
                }
            });
        });
    }
}

/* ---------------------------------------------------------
   7. ЗАПУСК
   Ждем полной загрузки DOM перед стартом
   --------------------------------------------------------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Экспортируем функции для использования в других модулях
export { showRoom, state, updateGlobalUI };