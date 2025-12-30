import { Game } from './game.js';
import { ArcadeGame } from './arcade.js';

const tg = window.Telegram?.WebApp;

const scenes = {
    home: document.getElementById('scene-home'),
    modeSelection: document.getElementById('scene-mode-selection'),
    gameOver: document.getElementById('game-over')
};

function forceLayout() {
    if (tg) {
        tg.ready();
        tg.expand();
        // Красим системные части
        tg.setHeaderColor('#4ec0ca');
        tg.setBackgroundColor('#4ec0ca');
    }
    
    const vh = window.innerHeight;
    document.getElementById('root').style.height = vh + 'px';
    
    if (window.game) window.game.resize();
    if (window.arcade) window.arcade.resize();
    
    window.scrollTo(0, 0);
}

function showRoom(name) {
    Object.values(scenes).forEach(s => s.classList.add('hidden'));
    if (scenes[name]) scenes[name].classList.remove('hidden');
}

async function init() {
    forceLayout();
    // Повторяем через паузу, когда WebView окончательно развернется
    setTimeout(forceLayout, 200);

    const canvas = document.getElementById('game-canvas');
    window.game = new Game(canvas, () => showRoom('gameOver'));
    window.arcade = new ArcadeGame(canvas, () => showRoom('gameOver'));

    document.getElementById('btn-start').onclick = () => showRoom('modeSelection');
    
    document.getElementById('btn-mode-classic').onclick = () => {
        showRoom('none'); // Скрываем интерфейс
        window.game.start();
    };

    document.getElementById('btn-mode-arcade').onclick = () => {
        showRoom('none');
        window.arcade.start();
    };

    document.getElementById('btn-exit-gameover').onclick = () => showRoom('home');

    window.addEventListener('resize', forceLayout);
}

init();