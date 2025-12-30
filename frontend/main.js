import * as api from './api.js';
import { Game } from './game.js';
import { ArcadeGame } from './arcade.js';

const tg = window.Telegram?.WebApp;

const state = { 
    coins: 0,
    currentMode: 'classic',
    powerups: { heart: 0 }
};

const scenes = {
    home: document.getElementById('scene-home'),
    modeSelection: document.getElementById('scene-mode-selection'),
    game: document.getElementById('game-container'),
    gameOver: document.getElementById('game-over')
};

// --- ФУНКЦИЯ ПРИНУДИТЕЛЬНОГО ПОЛНОГО ЭКРАНА ---
function forceFullHeight() {
    if (!tg) return;
    tg.expand(); // Сообщаем Telegram расшириться
    
    const vh = window.innerHeight;
    document.documentElement.style.height = `${vh}px`;
    document.body.style.height = `${vh}px`;
    document.getElementById('app').style.height = `${vh}px`;
    
    window.scrollTo(0, 0);

    // Обновляем размеры движков
    if (window.game) window.game.resize();
    if (window.arcadeGame) window.arcadeGame.resize();
}

function showRoom(roomName) {
    Object.values(scenes).forEach(s => s?.classList.add('hidden'));
    scenes[roomName]?.classList.remove('hidden');

    if (roomName === 'game') {
        const engine = state.currentMode === 'classic' ? window.game : window.arcadeGame;
        engine?.start();
    }
}

async function init() {
    if (tg) {
        tg.ready();
        tg.setHeaderColor('#4ec0ca');
        tg.setBackgroundColor('#4ec0ca');
    }

    // Запускаем форсирование высоты сразу и через паузы
    forceFullHeight();
    [100, 300, 500, 1000].forEach(ms => setTimeout(forceFullHeight, ms));

    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        window.game = new Game(canvas, (s) => handleGameOver(s));
        window.arcadeGame = new ArcadeGame(canvas, (s) => handleGameOver(s));
    }

    // Привязка кнопок
    document.getElementById('btn-start').onclick = () => showRoom('modeSelection');
    document.getElementById('btn-mode-classic').onclick = () => { state.currentMode = 'classic'; showRoom('game'); };
    document.getElementById('btn-mode-arcade').onclick = () => { state.currentMode = 'arcade'; showRoom('game'); };
    document.getElementById('btn-exit-gameover').onclick = () => showRoom('home');

    window.addEventListener('resize', forceFullHeight);
    showRoom('home');
}

function handleGameOver(score) {
    showRoom('gameOver');
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}