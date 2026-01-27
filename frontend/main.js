/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Версия: 1.6 (FINAL STABLE)
 * Содержит: Логику навигации, 3 режима игры, магазин, инвентарь, кошелек и синхронизацию.
 */

// --- 1. ИМПОРТЫ МОДУЛЕЙ ---
// Импортируем методы для общения с сервером (бэкендом)
import * as api from './api.js';
// Импортируем игровой движок Классического режима
import { Game } from './game.js';
// Импортируем игровой движок Аркадного режима
import { ArcadeGame } from './arcade.js';
// Импортируем игровой движок Карьеры (восстановлено!)
import { CareerGame } from './career.js';
// Импортируем менеджер кошелька TON
import { WalletManager } from './wallet.js'; 

import { DailyTracker } from './js/DailyTracker.js';
import { AudioManager } from './js/audio_manager.js';



// Импорт функций для инициализации каждой комнаты (экрана)
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';
import { initCareerMap } from './js/rooms/career_map.js';

// Инициализация объекта Telegram WebApp
const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   Хранит все данные текущей сессии.
   --------------------------------------------------------- */
const state = { 
    user: null,                // Данные пользователя из БД
    coins: 0,                  // Монеты (🟡)
    lives: 5,                  // Энергия (⚡) для входа в уровни
    crystals: 0,               // Кристаллы (💎) премиум
    inventory: [],             // Массив купленных скинов
    currentMode: 'classic',    // Текущий режим ('classic', 'arcade', 'career')
    settings: { sound: true, music: true }, // Настройки аудио
    powerups: { heart: 0, shield: 0, gap: 0, magnet: 0, ghost: 0 } // Количество способностей
};

/* ---------------------------------------------------------
   3. КЭШИРОВАНИЕ DOM-ЭЛЕМЕНТОВ (SCENES)
   Ссылки на основные экраны приложения.
   --------------------------------------------------------- */
const scenes = {
    home: document.getElementById('scene-home'),           // Главное меню
    modeSelection: document.getElementById('scene-mode-selection'), // Выбор режима
    game: document.getElementById('game-container'),       // Экран игры
    shop: document.getElementById('scene-shop'),           // Магазин
    leaderboard: document.getElementById('scene-leaderboard'), // Топ
    friends: document.getElementById('scene-friends'),     // Друзья
    inventory: document.getElementById('scene-inventory'), // Инвентарь
    daily: document.getElementById('scene-daily'),         // Ежедневные
    settings: document.getElementById('scene-settings'),   // Настройки
    gameOver: document.getElementById('game-over'),        // Модалка проигрыша
    pauseMenu: document.getElementById('pause-menu'),      // Модалка паузы
    careerMap: document.getElementById('scene-career-map') // Карта уровней (восстановлено)
};

/* ---------------------------------------------------------
   4. ФУНКЦИИ СОХРАНЕНИЯ
   --------------------------------------------------------- */
// Функция сохранения данных (локально + сервер)
async function saveData() {
    // Сохраняем в память телефона (быстро)
    localStorage.setItem('game_state', JSON.stringify({
        coins: state.coins,
        inventory: state.inventory,
        powerups: state.powerups
    }));
    
    // Отправляем на сервер (если есть интернет)
    try {
        if (api.syncState) {
            await api.syncState(state);
            console.log("Данные синхронизированы!");
        }
    } catch (e) {
        console.warn("Ошибка сохранения на сервер:", e);
    }
}
// Делаем доступной глобально
window.saveData = saveData; 

// Функция активации способности (Щит, Магнит и т.д.)
async function activateAbility(id) {
    // Проверяем, сколько предметов есть
    const realCount = state.powerups[id] || 0;
    
    // Работает только в Аркаде и если есть предмет
    if (state.currentMode === 'arcade' && realCount > 0) {
        // Проверяем, не активен ли эффект уже сейчас
        if (window.arcadeGame && window.arcadeGame.activePowerups && window.arcadeGame.activePowerups[id] <= 0) {
            
            // Списываем 1 штуку
            state.powerups[id]--;
            
            // Включаем эффект в движке
            window.arcadeGame.activatePowerupEffect(id);
            
            // Обновляем UI
          updatePowerupsPanel();
            updateGlobalUI();
            
            // Логика ежедневного задания "Использовать способность"
            const useTask = state.user?.daily_challenges?.find(c => c.id.startsWith('use_'));
            if (useTask && (useTask.progress || 0) < useTask.target) {
                useTask.progress = (useTask.progress || 0) + 1;
            }

            // Сохраняем
            saveData();
            
            // Вибрация успеха
            tg?.HapticFeedback.notificationOccurred('success');
        }
    } else if (realCount === 0) {
        // Вибрация ошибки (нет предметов)
        tg?.HapticFeedback.notificationOccurred('error');
    }
}
window.activateAbility = activateAbility;

/* ---------------------------------------------------------
   5. НАВИГАЦИЯ (showRoom)
   Переключает экраны и управляет элементами интерфейса.
   --------------------------------------------------------- */
function showRoom(roomName) {
    console.log(`[Navigation] Переход в: ${roomName}`);
    
    // Скрываем ВСЕ комнаты
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    
    // Скрываем все модальные окна (на всякий случай)
    document.querySelectorAll('.modal-bg').forEach(el => el.classList.add('hidden'));

    // Находим нужную комнату
    const target = scenes[roomName];
    if (!target) return console.error(`Ошибка: Сцена "${roomName}" не найдена!`);
    
    // Показываем комнату
    target.classList.remove('hidden');

    // --- Управление Хедером ---
    const header = document.getElementById('header');
    if (header) {
        // Хедер виден всегда (flex), кроме моментов загрузки
        header.style.display = 'flex';
    }

    // --- Управление Кнопкой Паузы ---
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        // Видна ТОЛЬКО на экране игры
        pauseBtn.style.display = (roomName === 'game') ? 'block' : 'none';
    }

    // --- Управление Нижним Меню ---
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        // Скрываем меню в Игре, Карьере, Выборе режима и Оверлеях
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu', 'careerMap'].includes(roomName);
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    // --- ЛОГИКА ЗАПУСКА ИГРЫ ---
    if (roomName === 'game') {

        document.getElementById('score-overlay').innerText = '0';
        // Останавливаем все движки перед сменой
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
        // Карьеру не стопаем жестко, так как она может быть на паузе
        
        const isClassic = state.currentMode === 'classic';
        const isCareer = state.currentMode === 'career';

        // Панель способностей (Только Аркада)
        const arcadeUI = document.querySelector('.ingame-ui-left') || document.getElementById('ingame-inventory');
        if (arcadeUI) {
            arcadeUI.style.display = (state.currentMode === 'arcade') ? 'flex' : 'none';
            // Если Аркада — обновляем цифры на кнопках
            if (state.currentMode === 'arcade') updatePowerupsPanel();
        }
        
        // Выбираем правильный движок
        let engine = null;
        if (isClassic) engine = window.game;
        else if (isCareer) engine = window.careerGame;
        else engine = window.arcadeGame;

        if (engine) {
            engine.resize(); // Подгоняем размер
            // Если это НЕ карьера — запускаем сразу. 
            // Карьера запускается отдельно через startLevel() из карты.
            if (!isCareer) engine.start(); 
        }
    }

    // --- ИНИЦИАЛИЗАЦИЯ КОМНАТ ---
    // Небольшая задержка, чтобы DOM успел отрисоваться
    setTimeout(() => {
        try {
            switch(roomName) {
                case 'shop': initShop(); break;
                case 'inventory': initInventory(); break;
                case 'friends': initFriends(); break;
                case 'daily': initDaily(); break;
                case 'leaderboard': initLeaderboard(); break;
                case 'settings': initSettings(); break;
                case 'careerMap': initCareerMap(); break; // Инит карты
            }
            updateGlobalUI(); // Обновляем балансы
        } catch (e) { console.error(`Ошибка комнаты ${roomName}:`, e); }
    }, 10);
}
window.showRoom = showRoom;

/* ---------------------------------------------------------
   6. ИНИЦИАЛИЗАЦИЯ (init) - Точка входа
   --------------------------------------------------------- */
/* ---------------------------------------------------------
   6. ИНИЦИАЛИЗАЦИЯ (init) - Точка входа
   --------------------------------------------------------- */
async function init() {
    // Сообщаем Телеграму о готовности
    if (tg) { 
        tg.ready(); 
        tg.expand(); 
        
        // Автопауза при свайпе шторки вниз (специфично для Telegram)
        tg.onEvent('viewportChanged', ({ isStateStable }) => {
            if (!isStateStable) {
                window.audioManager?.pauseMusic();
            } else if (window.audioManager?.musicEnabled) {
                window.audioManager?.playMusic();
            }
        });
    }
    
    // Инициализация игровых движков
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
        // Важно: принимаем score (s) и передаем его дальше
        window.careerGame = new CareerGame(canvas, (lvl) => handleCareerWin(lvl), (s) => handleCareerLose(s));
    }
    
    // Инициализация кошелька
    try { 
        window.wallet = new WalletManager(); 
        if (window.wallet.tonConnectUI) {
            window.wallet.tonConnectUI.onStatusChange(async (wallet) => {
                const isConnected = !!wallet;
                if (isConnected) {
                    const walletAddress = wallet.account.address;
                    await api.apiRequest('auth', 'POST', { action: 'update_wallet_info', wallet_address: walletAddress });
                } else {
                    await api.apiRequest('auth', 'POST', { action: 'update_wallet_info', wallet_address: null });
                }
                window.updateGlobalUI?.(); 
            });
        }
    } catch (e) { console.warn("Wallet skip:", e); }

    // Инициализация Аудио и Фокуса (Visibility API)
    window.audioManager = new AudioManager();
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            window.audioManager?.pauseMusic();
            if (window.audioManager?.ctx) window.audioManager.ctx.suspend();
        } else {
            if (window.audioManager?.musicEnabled) window.audioManager?.playMusic();
            if (window.audioManager?.ctx) window.audioManager.ctx.resume();
        }
    });

    // --- СЛУШАТЕЛЬ СОБЫТИЯ ПОКУПКИ ---
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
            await saveData();
        } else {
            tg?.HapticFeedback.notificationOccurred('error');
            alert("Not enough coins!");
        }
    });

    // --- БИНДИНГ КНОПОК ---
    const bind = (id, room) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            window.audioManager?.playSound('button_click');
            tg?.HapticFeedback.impactOccurred('light');
            showRoom(room);
        };
    };
    
    bind('btn-shop', 'shop');
    bind('btn-inventory', 'inventory');
    bind('btn-friends', 'friends');
    bind('btn-settings', 'settings');
    bind('btn-home-panel', 'home');
    bind('btn-back-to-home', 'home');
    bind('btn-start', 'modeSelection');
    bind('top-btn', 'leaderboard');
    bind('daily-btn', 'daily');

    // Режимы игры
    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => {
        window.dispatchEvent(new CustomEvent('game_event', { detail: { type: 'round_started' } }));
        state.currentMode = 'classic'; 
        showRoom('game'); 
    };

    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { 
        state.currentMode = 'arcade'; 
        showRoom('game'); 
    };

    const btnCareer = document.getElementById('btn-mode-career');
    if (btnCareer) btnCareer.onclick = () => {
        state.currentMode = 'career';
        showRoom('careerMap');
    };

    const btnBackCareer = document.getElementById('btn-back-from-career');
    if (btnBackCareer) btnBackCareer.onclick = () => showRoom('modeSelection');

    // Пауза и Resume
    const pauseTrigger = document.getElementById('pause-btn');
    if (pauseTrigger) {
        pauseTrigger.onclick = (e) => {
            e.preventDefault();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            if (window.careerGame) window.careerGame.isRunning = false;
            document.getElementById('pause-menu').classList.remove('hidden');
        };
    }

    const resBtn = document.getElementById('btn-resume');
    if (resBtn) resBtn.onclick = () => {
        document.getElementById('pause-menu').classList.add('hidden');
        if (state.currentMode === 'classic' && window.game) {
            window.game.isRunning = true; window.game.loop();
        } else if (state.currentMode === 'arcade' && window.arcadeGame) {
            window.arcadeGame.isRunning = true; window.arcadeGame.loop();
        } else if (state.currentMode === 'career' && window.careerGame) {
            window.careerGame.isRunning = true; window.careerGame.loop();
        }
    };
    
    document.getElementById('btn-exit-home')?.addEventListener('click', () => showRoom('home'));
    
    const reviveBtn = document.getElementById('btn-revive');
    if (reviveBtn) {
        reviveBtn.onclick = (e) => {
            e.preventDefault();
            if (state.powerups.heart > 0 && !reviveBtn.disabled) {
                state.powerups.heart--;
                updateGlobalUI();
                document.getElementById('game-over').classList.add('hidden');
                let engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                if(state.currentMode === 'career') engine = window.careerGame;
                engine.revive();
                saveData();
            }
        };
    }
    
   document.getElementById('btn-restart')?.addEventListener('click', () => {
        document.getElementById('game-over').classList.add('hidden');
        if (state.currentMode === 'career') {
            // Возвращаемся на карту, чтобы выбрать уровень заново (или тот же)
            showRoom('careerMap'); 
        } else {
            // В классике/аркаде просто перезапускаем сцену
            showRoom('game');
        }
    });
    
    document.getElementById('btn-exit-gameover')?.addEventListener('click', () => showRoom('home'));

    // --- АВТОРИЗАЦИЯ И ЗАГРУЗКА ---
    try {
        const startParam = tg?.initDataUnsafe?.start_app_param || tg?.initDataUnsafe?.start_param || "";
        const auth = await api.authPlayer(startParam, tg?.initData || "");         
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
            if (auth.user.powerups) state.powerups = { ...state.powerups, ...auth.user.powerups };
        }
    } catch (e) { console.error("Login Error:", e); }

    window.dailyTracker = new DailyTracker();
    window.state = state;
    updateGlobalUI();
    showRoom('home'); 
}

/* ---------------------------------------------------------
   7. ОБРАБОТКА ПОБЕДЫ И ПОРАЖЕНИЯ (ВСЕ РЕЖИМЫ)
   --------------------------------------------------------- */

// Обычный Game Over (Классика/Аркада)
function handleGameOver(score, reviveUsed) {
    const goScreen = document.getElementById('game-over');
    goScreen.classList.remove('hidden');
    
    // Обновляем счет
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) scoreEl.innerText = score;
    
    // Настраиваем кнопку сердца
    const btnRev = document.getElementById('btn-revive');
    const revCount = document.getElementById('revive-count'); 
    
    if (btnRev) {
        // Логика доступности: Не карьера (пока что), не юзали, есть запас
        const canRev = state.currentMode !== 'career' && !reviveUsed && state.powerups.heart > 0;
        const heartsLeft = state.powerups.heart || 0;
        
        if (revCount) revCount.innerText = `(${heartsLeft})`;

        if (canRev) {
            btnRev.disabled = false;
            btnRev.style.opacity = "1";
            btnRev.style.filter = "none";
            btnRev.style.cursor = "pointer";
        } else {
            btnRev.disabled = true;
            btnRev.style.opacity = "0.5";
            btnRev.style.filter = "grayscale(1)";
            btnRev.style.cursor = "not-allowed";
        }
    }
    
    saveData();
    // Сохраняем рекорд (кроме карьеры)
    if(state.currentMode !== 'career') api.saveScore(score).catch(e => console.log("Score not saved:", e));
}

// КАРЬЕРА: Победа
async function handleCareerWin(levelId) {
    tg?.HapticFeedback.notificationOccurred('success');
    
    try {
        const res = await api.apiRequest('career', 'POST', { 
            action: 'complete_level', 
            level: levelId 
        });

        if (res && res.success) {
            // Обновляем max_level в state
            state.user.max_level = Math.max(state.user.max_level, levelId + 1);
            
            // Награда (сервер пришлет, сколько мы заработали)
            if (res.reward_coins) state.coins += res.reward_coins;
            if (res.reward_crystals) state.crystals += res.reward_crystals;

            updateGlobalUI();
            
            tg?.showConfirm(`Уровень ${levelId} пройден! 🏆`, () => {
                showRoom('careerMap'); 
            });
        }
    } catch (e) {
        console.error("Ошибка завершения уровня:", e);
        showRoom('careerMap');
    }
}

// КАРЬЕРА: Поражение
function handleCareerLose(score) {
    // Используем общее окно проигрыша, но без флага reviveUsed
    // Логика внутри handleGameOver сама скроет кнопку сердца, так как режим 'career'
    handleGameOver(score || 0, false);
}

/* ---------------------------------------------------------
   8. ОБНОВЛЕНИЕ UI (3 ВАЛЮТЫ)
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // 1. Энергия (lives)
    const enEl = document.getElementById('header-energy');
    if (enEl) enEl.innerText = state.lives;

    // 2. Монеты (coins)
    const cEl = document.getElementById('header-coins');
    if (cEl) cEl.innerText = Number(state.coins).toLocaleString();
    
    // 3. Кристаллы (crystals)
    const crEl = document.getElementById('header-crystals');
    if (crEl) crEl.innerText = state.crystals;

    // Бейджи способностей
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val > 3 ? "3+" : val;
        });
    });

    // Панель в игре (только Аркада)
    if (scenes.game && !scenes.game.classList.contains('hidden')) {
        updatePowerupsPanel();
    }
    if (typeof window.refreshWalletUI === 'function') window.refreshWalletUI();

    if (window.audioManager) {
        window.audioManager.updateAudioSettings();
    }

}
window.updateGlobalUI = updateGlobalUI;

// Обновление кнопок способностей
function updatePowerupsPanel() {
    const abilities = ['shield', 'gap', 'ghost', 'magnet'];
    abilities.forEach(id => {
        const slots = document.querySelectorAll(`[data-ability="${id}"]`);
        const realCount = state.powerups[id] || 0;
        
        slots.forEach(slot => {
            const countSpan = slot.querySelector('.count') || slot.querySelector('.badge');
            if (countSpan) countSpan.innerText = realCount > 3 ? "3+" : realCount;
            
            if (realCount <= 0) {
                slot.style.opacity = "0.3";
                slot.style.filter = "grayscale(1)";
                slot.style.pointerEvents = "none";
            } else {
                slot.style.opacity = "1";
                slot.style.filter = "grayscale(0)";
                slot.style.pointerEvents = "auto";
            }
            
            slot.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                activateAbility(id);
            };
        });
    });
}
window.updatePowerupsPanel = updatePowerupsPanel;

// ЗАПУСК
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };