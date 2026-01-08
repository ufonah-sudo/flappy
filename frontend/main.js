/**
 * ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (main.js)
 * Назначение: Импорты, Глобальный стейт, Навигация, Магазин и Синхронизация данных.
 * Версия: 1.3 (Полная, с Карьерой)
 */

// --- 1. ИМПОРТЫ МОДУЛЕЙ ---
import * as api from './api.js';           // Модуль API (Бэкенд)
import { Game } from './game.js';          // Движок Классики
import { ArcadeGame } from './arcade.js';  // Движок Аркады
import { CareerGame } from './career.js';  // Движок Карьеры (ВЕРНУЛ ИМПОРТ)
import { WalletManager } from './wallet.js'; // TON Кошелек

// Импорт инициализаторов комнат
import { initShop } from './js/rooms/shop.js';
import { initInventory } from './js/rooms/inventory.js';
import { initFriends } from './js/rooms/friends.js';
import { initDaily } from './js/rooms/daily.js';
import { initLeaderboard } from './js/rooms/leaderboard.js';
import { initSettings } from './js/rooms/settings.js';
import { initCareerMap } from './js/rooms/career_map.js';

// Инициализация Telegram SDK
const tg = window.Telegram?.WebApp;

/* ---------------------------------------------------------
   2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE)
   --------------------------------------------------------- */
const state = { 
    user: null,                // Данные профиля
    coins: 0,                  // Монеты
    lives: 5,                  // Энергия (⚡)
    crystals: 0,               // Кристаллы (💎)
    inventory: [],             // Массив купленных предметов
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
    pauseMenu: document.getElementById('pause-menu'),
    careerMap: document.getElementById('scene-career-map') // Карта карьеры
};

/* ---------------------------------------------------------
   4. ФУНКЦИИ СОХРАНЕНИЯ (Синхронизация)
   --------------------------------------------------------- */
async function saveData() {
    localStorage.setItem('game_state', JSON.stringify({
        coins: state.coins,
        inventory: state.inventory,
        powerups: state.powerups
    }));
    try {
        if (api.syncState) await api.syncState(state);
    } catch (e) {
        console.warn("Ошибка сохранения на сервер:", e);
    }
}
window.saveData = saveData;

async function activateAbility(id) {
    const realCount = state.powerups[id] || 0;
    
    // Способности работают только в Аркаде
    if (state.currentMode === 'arcade' && realCount > 0) {
        if (window.arcadeGame && window.arcadeGame.activePowerups && window.arcadeGame.activePowerups[id] <= 0) {
            state.powerups[id]--;
            window.arcadeGame.activatePowerupEffect(id);
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
    
    Object.values(scenes).forEach(scene => { if (scene) scene.classList.add('hidden'); });
    
    const target = scenes[roomName];
    if (!target) return console.error(`Ошибка: Сцена "${roomName}" не найдена!`);
    target.classList.remove('hidden');

    // Хедер
    const header = document.getElementById('header');
    if (header) {
        // Хедер виден всегда (flex), кроме загрузки
        header.style.display = 'flex';
    }

    // Пауза
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.classList.toggle('hidden', roomName !== 'game');

    // Нижнее меню
    const bottomPanel = document.querySelector('.menu-buttons-panel');
    if (bottomPanel) {
        // Скрываем меню в игре, выборе режима, карте карьеры и оверлеях
        const hideBottom = ['game', 'gameOver', 'modeSelection', 'pauseMenu', 'careerMap'].includes(roomName);
        bottomPanel.style.setProperty('display', hideBottom ? 'none' : 'flex', 'important');
    }

    // ЛОГИКА ЗАПУСКА ИГРЫ
    if (roomName === 'game') {
        // Останавливаем все движки
        if (window.game) window.game.isRunning = false;
        if (window.arcadeGame) window.arcadeGame.isRunning = false;
        // Карьеру не останавливаем здесь жестко, так как она может быть на паузе
        
        const isClassic = state.currentMode === 'classic';
        const isCareer = state.currentMode === 'career';

        // Панель способностей (Только Аркада)
        const arcadeUI = document.querySelector('.ingame-ui-left') || document.getElementById('ingame-inventory');
        if (arcadeUI) {
            arcadeUI.style.display = (state.currentMode === 'arcade') ? 'flex' : 'none';
            if (state.currentMode === 'arcade') updatePowerupsPanel();
        }
        
        // Выбираем движок
        let engine = null;
        if (isClassic) engine = window.game;
        else if (isCareer) engine = window.careerGame; // Выбираем карьеру
        else engine = window.arcadeGame;

        if (engine) {
            engine.resize();
            // Карьера запускается через startLevel в career_map.js, а остальные тут
            if (!isCareer) engine.start(); 
        }
    }

    // Инициализация комнат
    setTimeout(() => {
        try {
            switch(roomName) {
                case 'shop': initShop(); break;
                case 'inventory': initInventory(); break;
                case 'friends': initFriends(); break;
                case 'daily': initDaily(); break;
                case 'leaderboard': initLeaderboard(); break;
                case 'settings': initSettings(); break;
                case 'careerMap': initCareerMap(); break; // Инициализация карты
            }
            updateGlobalUI(); 
        } catch (e) { console.error(`Ошибка инициализации ${roomName}:`, e); }
    }, 10);
}
window.showRoom = showRoom;

/* ---------------------------------------------------------
   6. ИНИЦИАЛИЗАЦИЯ (init)
   --------------------------------------------------------- */
async function init() {
    if (tg) { tg.ready(); tg.expand(); }
    
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        // Классика
        window.game = new Game(canvas, (s, r) => handleGameOver(s, r));
        // Аркада
        window.arcadeGame = new ArcadeGame(canvas, (s, r) => handleGameOver(s, r));
        
        // --- ВЕРНУЛ ЭТУ СТРОКУ (Карьера) ---
        // Передаем canvas и функции win/lose
        window.careerGame = new CareerGame(canvas, (lvl) => handleCareerWin(lvl), () => handleCareerLose());
    }
    
    try { window.wallet = new WalletManager(); } catch (e) { console.warn("Wallet skip"); }

    // Покупка
    window.addEventListener('buy_item', async (e) => {
        const { id, price, type, powerupType } = e.detail;
        if (state.coins >= price) {
            state.coins -= price;
            if (type === 'powerup') state.powerups[powerupType] = (state.powerups[powerupType] || 0) + 1;
            else if (!state.inventory.includes(id)) state.inventory.push(id);
            
            tg?.HapticFeedback.notificationOccurred('success');
            updateGlobalUI();
            await saveData(); 
        } else {
            tg?.HapticFeedback.notificationOccurred('error');
            alert("Not enough coins!");
        }
    });

    // Биндинг кнопок
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
    bind('btn-back-to-home', 'home');
    bind('btn-start', 'modeSelection');
    bind('top-btn', 'leaderboard');
    bind('btn-top-icon', 'leaderboard');
    bind('daily-btn', 'daily');
    bind('btn-daily-icon', 'daily');

    const btnCl = document.getElementById('btn-mode-classic');
    if (btnCl) btnCl.onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    
    const btnAr = document.getElementById('btn-mode-arcade');
    if (btnAr) btnAr.onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };

    // --- КНОПКА КАРЬЕРЫ ---
    const btnCareer = document.getElementById('btn-mode-career');
    if (btnCareer) {
        btnCareer.onclick = () => {
            state.currentMode = 'career';
            showRoom('careerMap'); // Идем на карту
        };
    }
    // Назад из карты
    const btnBackCareer = document.getElementById('btn-back-from-career');
    if (btnBackCareer) btnBackCareer.onclick = () => showRoom('modeSelection');

    // Пауза
    const pauseTrigger = document.getElementById('pause-btn');
    if (pauseTrigger) {
        pauseTrigger.onclick = (e) => {
            e.preventDefault();
            if (window.game) window.game.isRunning = false;
            if (window.arcadeGame) window.arcadeGame.isRunning = false;
            // Ставим карьеру на паузу
            if (window.careerGame) window.careerGame.isRunning = false;
            showRoom('pauseMenu');
        };
    }

    const resBtn = document.getElementById('btn-resume');
    if (resBtn) resBtn.onclick = () => {
        showRoom('game');
        // Возобновляем нужный движок
        if (state.currentMode === 'career' && window.careerGame) window.careerGame.loop();
        else if (state.currentMode === 'classic' && window.game) window.game.loop();
        else if (state.currentMode === 'arcade' && window.arcadeGame) window.arcadeGame.loop();
    };
    
    const exitBtn = document.getElementById('btn-exit-home');
    if (exitBtn) exitBtn.onclick = () => showRoom('home');
    
    const reviveBtn = document.getElementById('btn-revive');
    if (reviveBtn) {
        reviveBtn.onclick = (e) => {
            e.preventDefault();
            if (state.powerups.heart > 0) {
                state.powerups.heart--;
                updateGlobalUI();
                
                // Выбираем кого оживлять
                let engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
                // В карьере пока просто рестарт уровня или простая механика (позже допилим, если надо)
                // Но пока даем стандартный ревайв
                
                engine.revive();
                showRoom('game');
                saveData();
            }
        };
    }
    
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.onclick = () => {
        // В карьере рестарт возвращает на карту (чтобы снова потратить энергию или выбрать другой)
        if(state.currentMode === 'career') showRoom('careerMap');
        else showRoom('game');
    };
    
    const exitGO = document.getElementById('btn-exit-gameover');
    if (exitGO) exitGO.onclick = () => showRoom('home');

    // Логин
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
    } catch (e) { console.error("Login Error:", e); }

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
        // В карьере пока отключаем ревайв, чтобы не ломать логику прохождения
        if (state.currentMode === 'career') {
            btnRev.classList.add('hidden');
        } else {
            const canRev = !reviveUsed && state.powerups.heart > 0;
            btnRev.classList.toggle('hidden', !canRev);
            btnRev.innerHTML = `USE HEART ❤️ <br><small>(${state.powerups.heart} LEFT)</small>`;
        }
    }
    
    saveData();
    // В карьере очки не сохраняем в общий лидерборд
    if(state.currentMode !== 'career') {
        api.saveScore(score).catch(e => console.log("Score not saved:", e));
    }
}

/* --- ВЕРНУЛ ЭТИ ФУНКЦИИ (ЛОГИКА КАРЬЕРЫ) --- */

// Победа в уровне
async function handleCareerWin(levelId) {
    tg?.showAlert("🏆 УРОВЕНЬ ПРОЙДЕН!");
    
    try {
        // Отправляем победу на сервер
        const res = await api.apiRequest('career', 'POST', { 
            action: 'complete_level', 
            level: levelId 
        });

        if (res && res.success) {
            // Если открылся новый уровень - обновляем стейт
            if (res.newMaxLevel) {
                state.user.max_level = res.newMaxLevel;
            }
            // Начисляем награду
            state.coins += res.reward || 0;
            updateGlobalUI();
        }
    } catch (e) {
        console.error("Ошибка сохранения карьеры:", e);
    }
    
    // Возвращаемся на карту
    showRoom('careerMap');
}

// Поражение в уровне
function handleCareerLose() {
    tg?.showAlert("💀 ТЫ ПРОИГРАЛ!\nПопробуй еще раз.");
    showRoom('careerMap');
}

/* ---------------------------------------------------------
   8. СИНХРОНИЗАЦИЯ ИНТЕРФЕЙСА (UI)
   --------------------------------------------------------- */
function updateGlobalUI() {
    if (!state) return;

    // 1. Энергия (⚡)
    const enEl = document.getElementById('header-energy');
    if (enEl) enEl.innerText = state.lives;

    // 2. Монеты (🟡)
    const cEl = document.getElementById('header-coins');
    if (cEl) cEl.innerText = Number(state.coins).toLocaleString();
    
    // 3. Кристаллы (💎)
    const crEl = document.getElementById('header-crystals');
    if (crEl) crEl.innerText = state.crystals;

    // Бейджи способностей
    Object.keys(state.powerups).forEach(key => {
        const val = state.powerups[key];
        document.querySelectorAll(`[data-powerup="${key}"]`).forEach(el => {
            el.innerText = val > 3 ? "3+" : val;
        });
    });

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

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { showRoom, state, updateGlobalUI };
