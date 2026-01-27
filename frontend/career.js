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
        if (!config) {
            console.error("Career: No config provided!");
            return;
        }

        console.log(`[Career] Start Level ${config.id}: Score Target ${config.targetScore}, Speed ${config.pipeSpeed}`);
        
        this.isFinished = false; 
        this.currentLevelConfig = config;

        // 1. Устанавливаем цель
        this.targetScore = config.targetScore || 10;
        
        // 2. СБРОС СОСТОЯНИЯ (важно остановить старый цикл)
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.isGhost = false;

        // 3. УСТАНОВКА СЛОЖНОСТИ (Синхронизация с levels.js)
        // Мы прописываем и pipeSpawnThreshold, и spawnInterval на случай разных версий game.js
        this.pipeSpeed = config.pipeSpeed || 3.5;
        this.pipeGap = config.gap || 150;
        this.pipeSpawnThreshold = config.spawnInterval || 1500;
        this.spawnInterval = config.spawnInterval || 1500; // Дубликат для надежности
        
        // Если в game.js есть поддержка цвета
        this.pipeColor = config.pipeColor || '#75b85b';

        this.isRunning = true;
        this.isPaused = false;

        // Обновляем интерфейс
        if (typeof this.updateScoreUI === 'function') this.updateScoreUI();
        
        window.dispatchEvent(new CustomEvent('game_event', { 
            detail: { type: 'career_level_started', levelId: config.id } 
        }));

        this.loop();
    }

    update() {
        if (!this.isRunning || this.isPaused || this.isFinished) return;

        // Вызываем физику родителя (движение птицы, спавн труб)
        super.update();

        // Проверяем условие победы
        if (!this.isFinished && this.score >= this.targetScore) {
            this.handleWin();
        }
    }

    handleWin() {
        if (this.isFinished) return;
        console.log("Level Complete!");
        
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
        if (this.isRunning || this.isFinished) {
            this.drawProgressBar();
        }
    }

    drawProgressBar() {
        const ctx = this.ctx;
        const padding = 30;
        const screenWidth = this.canvas.width; // Берем ширину канваса
        const w = screenWidth - (padding * 2);
        const h = 10;
        const x = padding;
        const y = 60; 

        const progress = Math.min(this.score / this.targetScore, 1);

        // Фон полоски
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x, y, w, h);

        // Сама полоска прогресса
        if (progress > 0) {
            ctx.fillStyle = '#f7d51d'; 
            ctx.fillRect(x, y, w * progress, h);
        }
    }
}