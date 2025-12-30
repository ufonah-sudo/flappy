const tg = window.Telegram?.WebApp;

// Функция для жесткой установки высоты
function updateViewport() {
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Принудительно скроллим в 0, чтобы скрыть адресную строку, если она есть
    window.scrollTo(0, 0);
    
    // Ресайзим движки, если они инициализированы
    if (window.game) window.game.resize();
    if (window.arcadeGame) window.arcadeGame.resize();
}

async function init() {
    if (tg) {
        tg.ready();
        tg.expand(); // Разворачиваем на всю высоту
        
        // Красим системные области в цвет игры, чтобы зазоры не были видны
        tg.setHeaderColor('#4ec0ca');
        tg.setBackgroundColor('#4ec0ca');
    }

    // Вызываем фикс высоты сразу и через интервалы (для медленных устройств)
    updateViewport();
    [100, 300, 600, 1000, 2000].forEach(ms => setTimeout(updateViewport, ms));

    window.addEventListener('resize', updateViewport);

    // Инициализация Canvas
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        // Тут твоя инициализация Game и ArcadeGame
        // window.game = new Game(canvas, ...);
    }

    // Показываем главный экран
    showRoom('home'); 
}

init();