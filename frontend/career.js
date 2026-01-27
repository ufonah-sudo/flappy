/**
 * career.js - ИНТЕГРИРОВАННЫЙ ДВИЖОК КАРЬЕРЫ
 * Наследует всё от классического движка, добавляя условия победы.
 */
import { Game } from './game.js'; // Импортируем твой основной движок

export class CareerGame extends Game {
    constructor(canvas, onWin, onLose) {
        // Вызываем конструктор классического Game
        super(canvas, (score, reviveUsed) => {
            // Если игра вызвала GameOver, перенаправляем в onLose карьеры
            if (onLose) onLose(score);
        });
        
        this.onWin = onWin;
        this.targetScore = 0;
        this.currentLevelConfig = null;
    }

    /**
     * Запуск конкретного уровня
     * @param {Object} config - данные уровня (targetScore, pipeSpeed и т.д.)
     */
    startLevel(config) {
        if (!config) return console.error("Career: No config provided!");

        this.currentLevelConfig = config;
        this.targetScore = config.targetScore || 10;
        
        // 1. Сбрасываем состояние через родительский метод
        // (но не вызываем start сразу, чтобы настроить параметры)
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.isGhost = false;

        // 2. Устанавливаем специфические настройки уровня
        // Если в конфиге нет параметров, используем адаптивные из resize()
        this.pipeSpeed = config.pipeSpeed || this.pipeSpeed;
        this.pipeSpawnThreshold = config.spawnInterval || this.pipeSpawnThreshold;
        
        // 3. Запускаем
        this.isRunning = true;
        this.updateScoreUI();
        
        // Генерируем событие старта
        window.dispatchEvent(new CustomEvent('game_event', { 
            detail: { type: 'career_level_started', levelId: config.id } 
        }));

        this.loop();
    }

    // Переопределяем update, чтобы добавить проверку победы
    update() {
        if (!this.isRunning || this.isPaused) return;

        // Вызываем базовую физику из game.js (движение, коллизии, очки)
        super.update();

        // ПРОВЕРКА ПОБЕДЫ
        if (this.isRunning && this.score >= this.targetScore) {
            this.handleWin();
        }
    }

    handleWin() {
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);

        // Вибрация успеха для Telegram
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        if (this.onWin) {
            this.onWin(this.currentLevelConfig.id);
        }
    }

    // Добавляем отрисовку прогресс-бара поверх классики
    draw() {
        // Отрисовка всего из классического движка
        super.draw();

        // Если игра идет, рисуем полоску прогресса
        if (this.isRunning) {
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