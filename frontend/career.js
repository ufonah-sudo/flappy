export class CareerGame extends Game {
    constructor(canvas, onWin, onLose) {
        super(canvas, (score, reviveUsed) => {
            if (onLose) onLose(score);
        });
        
        this.onWin = onWin;
        this.targetScore = 0;
        this.currentLevelConfig = null;
        this.isFinished = false; // ПРЕДОХРАНИТЕЛЬ
    }

    startLevel(config) {
        if (!config) return console.error("Career: No config provided!");
        
        this.isFinished = false; // Сбрасываем при старте
        this.currentLevelConfig = config;
        this.targetScore = config.targetScore || 10;
        
        // Сброс анимации
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.isGhost = false;

        this.pipeSpeed = config.pipeSpeed || this.pipeSpeed;
        this.pipeSpawnThreshold = config.spawnInterval || this.pipeSpawnThreshold;
        
        this.isRunning = true;
        this.updateScoreUI();
        
        window.dispatchEvent(new CustomEvent('game_event', { 
            detail: { type: 'career_level_started', levelId: config.id } 
        }));

        this.loop();
    }

    update() {
        if (!this.isRunning || this.isPaused || this.isFinished) return;

        super.update();

        // Проверяем победу только если уровень еще не закончен
        if (!this.isFinished && this.score >= this.targetScore) {
            this.handleWin();
        }
    }

    handleWin() {
        this.isFinished = true; // Мгновенно блокируем повторный вход
        this.isRunning = false;
        
        cancelAnimationFrame(this.animationId); // Останавливаем цикл отрисовки

        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        console.log("Career: Win detected, calling onWin");

        if (this.onWin) {
            // Вызываем колбек (который идет в API)
            this.onWin(this.currentLevelConfig.id);
        }
    }

    draw() {
        super.draw();
        if (this.isRunning || this.isFinished) {
            this.drawProgressBar();
        }
    }

    drawProgressBar() {
        const ctx = this.ctx;
        const padding = 30;
        const w = window.innerWidth - (padding * 2);
        const h = 8;
        const x = padding;
        const y = 50; // Под счетчиком очков

        const progress = Math.min(this.score / this.targetScore, 1);

        // Фон прогресса
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();

        // Заполнение
        if (progress > 0) {
            ctx.fillStyle = '#f7d51d'; // Желтый цвет карьеры
            ctx.beginPath();
            ctx.roundRect(x, y, w * progress, h, 4);
            ctx.fill();
        }
    }
}