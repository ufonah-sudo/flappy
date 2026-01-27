/**
 * career.js - ИНТЕГРИРОВАННЫЙ ДВИЖОК КАРЬЕРЫ (ФИНАЛЬНАЯ ВЕРСИЯ)
 */
import { Game } from './game.js'; 

export class CareerGame extends Game {
    constructor(canvas, onWin, onLose) {
        super(canvas, (score, reviveUsed) => {
            if (onLose) onLose(score);
        });
        
        this.onWin = onWin;
        this.targetScore = 0;
        this.currentLevelConfig = null;
        this.isFinished = false; 
    }

    startLevel(config) {
        if (!config) return;

        // 1. Обязательно сбрасываем старый цикл анимации, чтобы они не накладывались
        if (this.animationId) cancelAnimationFrame(this.animationId);

        this.isFinished = false; 
        this.currentLevelConfig = config;
        
        // 2. Устанавливаем параметры из твоего уровня
        this.targetScore = config.targetScore || 10;
        this.pipeSpeed = config.pipeSpeed || 3.5;
        this.pipeGap = config.gap || 150;
        
        // ВАЖНО: В твоем game.js логика спавна завязана на pipeSpawnThreshold.
        // Мы пересчитываем его из миллисекунд в кадры (примерно 60fps)
        // Если в конфиге 1500мс, то это примерно 90 кадров.
        this.pipeSpawnThreshold = Math.floor((config.spawnInterval || 1500) / 16.6);

        // 3. Полный сброс состояния
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.isGhost = false;

        // Настройка цвета (если хочешь использовать из конфига)
        this.currentPipeColor = config.pipeColor || '#75b85b';

        this.isRunning = true;
        this.isPaused = false;
        
        if (this.updateScoreUI) this.updateScoreUI();
        
        window.dispatchEvent(new CustomEvent('game_event', { 
            detail: { type: 'career_level_started', levelId: config.id } 
        }));

        this.loop();
    }

    // Переопределяем метод спавна труб, чтобы он учитывал GAP из конфига уровней
    spawnPipe() {
        // Берем gap из текущего уровня, если его нет — стандартный расчет из game.js
        const gap = this.pipeGap || (window.innerHeight > 800 ? 190 : window.innerHeight * 0.15);
        const minH = 100; 
        const safeBottomMargin = this.ground.h + 80; 
        const maxH = window.innerHeight - gap - safeBottomMargin;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;
        
        this.pipes.push({
            x: window.innerWidth,
            width: 75, 
            top: h,
            bottom: h + gap,
            passed: false,
            color: this.currentPipeColor // Передаем цвет для отрисовки
        });
    }

    update() {
        if (!this.isRunning || this.isPaused || this.isFinished) return;

        super.update();

        // Проверка победы
        if (!this.isFinished && this.score >= this.targetScore) {
            this.handleWin();
        }
    }

    handleWin() {
        this.isFinished = true; 
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);

        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        if (typeof this.onWin === 'function') {
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
        const w = this.canvas.width / (window.devicePixelRatio || 1) - (padding * 2);
        const h = 8;
        const x = padding;
        const y = 60; 
        const progress = Math.min(this.score / this.targetScore, 1);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, y, w, h);
        if (progress > 0) {
            ctx.fillStyle = '#f7d51d'; 
            ctx.fillRect(x, y, w * progress, h);
        }
    }
}