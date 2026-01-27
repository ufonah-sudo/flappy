/**
 * career.js - ИНТЕГРИРОВАННЫЙ ДВИЖОК КАРЬЕРЫ
 */
import { Game } from './game.js'; 

export class CareerGame extends Game {
    constructor(canvas, onWin, onLose) {
        // Инициализируем родительский класс Game
        super(canvas, (score, reviveUsed) => {
            if (onLose) onLose(score);
        });
        
        this.onWin = onWin;
        this.targetScore = 0;
        this.currentLevelConfig = null;
        this.isFinished = false; 
    }

    startLevel(config) {
        if (!config) {
            console.error("Career: No config provided!");
            return;
        }

        console.log("Starting level:", config.id);
        
        this.isFinished = false; 
        this.currentLevelConfig = config;
        this.targetScore = config.targetScore || 10;
        
        // Сброс старой анимации
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Базовые параметры (дублируем из старта, чтобы быть уверенными)
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.isGhost = false;

        // Настройки из конфига
        if (config.pipeSpeed) this.pipeSpeed = config.pipeSpeed;
        if (config.spawnInterval) this.pipeSpawnThreshold = config.spawnInterval;
        
        this.isRunning = true;
        this.updateScoreUI();
        
        window.dispatchEvent(new CustomEvent('game_event', { 
            detail: { type: 'career_level_started', levelId: config.id } 
        }));

        this.loop();
    }

    update() {
        // Если игра завершена или на паузе — ничего не делаем
        if (!this.isRunning || this.isPaused || this.isFinished) return;

        // Вызываем физику родителя
        super.update();

        // Проверяем победу
        if (!this.isFinished && this.score >= this.targetScore) {
            this.handleWin();
        }
    }

    handleWin() {
        console.log("Win condition met!");
        this.isFinished = true; 
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        if (typeof this.onWin === 'function') {
            this.onWin(this.currentLevelConfig.id);
        }
    }

    draw() {
        super.draw();
        // Рисуем прогресс, если уровень в процессе или только что закончен
        if (this.isRunning || this.isFinished) {
            this.drawProgressBar();
        }
    }

    drawProgressBar() {
        const ctx = this.ctx;
        const padding = 30;
        const screenWidth = window.innerWidth;
        const w = screenWidth - (padding * 2);
        const h = 8;
        const x = padding;
        const y = 50; 

        const progress = Math.min(this.score / this.targetScore, 1);

        // Используем обычный fillRect вместо roundRect для совместимости
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, y, w, h);

        if (progress > 0) {
            ctx.fillStyle = '#f7d51d'; 
            ctx.fillRect(x, y, w * progress, h);
        }
    }
}