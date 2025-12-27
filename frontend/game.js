/**
 * КЛАСС GAME - БАЗОВЫЙ ДВИЖОК И КЛАССИЧЕСКИЙ РЕЖИМ
 */
export class Game {
    constructor(canvas, onGameOver) {
        // --- ИНИЦИАЛИЗАЦИЯ ХОЛСТА ---
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver; // Коллбэк для вызова экрана Game Over
        
        // --- СОСТОЯНИЕ ОБЪЕКТОВ ---
        this.bird = { 
            x: 50, 
            y: 0, 
            size: 34, 
            velocity: 0, 
            rotation: 0 
        }; 
        this.pipes = [];
        this.score = 0;
        
        // --- ФЛАГИ СОСТОЯНИЯ ---
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false;  // Можно ли возродиться (один раз за раунд)
        this.shieldActive = false; // Активен ли щит в данный момент
        this.activePowerups = {}; // Для хранения активных бонусов из Arcade режима

        // --- ЗАГРУЗКА СПРАЙТОВ ПТИЦЫ (АНИМАЦИЯ) ---
        this.birdSprites = [];
        const sources = ['bird1.png', 'bird2.png', 'bird3.png'];
        sources.forEach(src => {
            const img = new Image();
            img.src = `/frontend/assets/${src}`; 
            this.birdSprites.push(img);
        });

        // Параметры анимации (смена кадров каждые 6 тиков)
        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 6; 

        // --- ПРИВЯЗКА КОНТЕКСТА МЕТОДОВ (BINDING) ---
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleResize = this.resize.bind(this);

        this.initEvents();
        this.resize();
    }

    /** Инициализация слушателей ввода */
    initEvents() {
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('resize', this.handleResize);
    }

    /** Адаптация под размер экрана и DPR (для четкости на Retina) */
    resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
        
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;
        
        // Динамический расчет физики от высоты экрана
        this.gravity = h * 0.0006;   // Сделано чуть тяжелее по твоей просьбе
        this.jump = -h * 0.010;      // Сила прыжка
        this.pipeSpeed = w * 0.007;  // Скорость труб (быстрее = сложнее)
        // Частота спавна труб зависит от ширины
        this.pipeSpawnThreshold = Math.max(90, Math.floor(110 * (w / 375)));
    }

    /** Запуск нового раунда */
    start() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.shieldActive = false; 

        this.updateScoreUI();
        this.isRunning = true;
        this.loop();
    }

    /** Возрождение (Revive) - вызывается после использования сердца */
    revive() {
        this.reviveUsed = true;
        this.isRunning = true;
        
        // Удаляем трубы перед носом, чтобы не умереть сразу
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 200);
        
        // Если птица улетела за экран, возвращаем в центр
        if (this.bird.y > window.innerHeight || this.bird.y < 0) {
            this.bird.y = window.innerHeight / 2;
        }
        
        this.bird.velocity = this.jump * 0.8; // Даем небольшой толчок вверх
        this.bird.rotation = 0;
        this.loop();
    }

    /** Обновление цифр на экране во время игры */
    updateScoreUI() {
        const scoreEl = document.getElementById('score-overlay');
        if (scoreEl) scoreEl.innerText = this.score;
    }

    /** Прыжок птицы */
    flap() {
        if (!this.isRunning || this.isPaused) return;
        this.bird.velocity = this.jump;
        
        // Вибрация в Telegram
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    handleInput(e) {
        if (this.isRunning && e.type === 'touchstart') e.preventDefault();
        this.flap();
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.flap();
        }
    }

    /** Генерация новой трубы */
    spawnPipe() {
        // Проем: в классике 22% от высоты, в аркаде с бонусом GAP - 40%
        const baseGap = window.innerHeight * 0.22;
        const currentGap = (this.activePowerups?.gap > 0) ? window.innerHeight * 0.4 : baseGap;
        
        const minH = 100;
        const maxH = window.innerHeight - currentGap - minH;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        this.pipes.push({
            x: window.innerWidth,
            width: 75, 
            top: h,
            bottom: h + currentGap,
            passed: false
        });
    }

    /** ГЛАВНАЯ ЛОГИКА ОБНОВЛЕНИЯ (ФИЗИКА И КОЛЛИЗИИ) */
    update() {
        if (!this.isRunning || this.isPaused) return;

        // 1. ПРИЗРАК (GHOST) - проверка состояния
        const isGhost = this.activePowerups?.ghost > 0;

        // Физика падения
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Вращение птицы в зависимости от скорости падения
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.15)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;

        // Анимация крыльев
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // Таймер спавна труб
        this.pipeSpawnTimer = (this.pipeSpawnTimer || 0) + 1;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // Обработка труб
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.pipeSpeed;

            // ПРОВЕРКА СТОЛКНОВЕНИЯ
            const pad = 10; // Отступ хитбокса для честности
            const hitX = this.bird.x + this.bird.size - pad > p.x && this.bird.x + pad < p.x + p.width;
            const hitY = this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom;

            if (hitX && hitY) {
                // Если активен ПРИЗРАК — игнорируем коллизию
                if (isGhost) {
                    // Просто летим дальше
                } 
                // Если активен ЩИТ (инвентарь или бонус)
                else if (this.shieldActive || (this.activePowerups?.shield > 0)) {
                    this.shieldActive = false; 
                    if (this.activePowerups?.shield) this.activePowerups.shield = 0;
                    this.pipes.splice(i, 1); // Уничтожаем трубу
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
                    }
                } 
                else {
                    this.gameOver();
                    return;
                }
            }

            // Начисление очков
            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                this.updateScoreUI();
            }

            // Удаление труб за экраном
            if (p.x < -p.width) this.pipes.splice(i, 1);
        }

        // Проверка выхода за верхнюю/нижнюю границу
        if (this.bird.y + this.bird.size > window.innerHeight || this.bird.y < -100) {
            this.gameOver();
        }
    }

    /** ОТРИСОВКА ГРАФИКИ */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем трубы
        this.pipes.forEach(p => {
            this.ctx.fillStyle = '#73bf2e';
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 3;
            this.drawPipeRect(p.x, 0, p.width, p.top, true);
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false);
        });

        // Рисуем птицу
        this.ctx.save();
        
        // Эффект призрака (полупрозрачность)
        if (this.activePowerups?.ghost > 0) this.ctx.globalAlpha = 0.5;

        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        // Эффект визуального поля щита
        if (this.shieldActive || this.activePowerups?.shield > 0) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size * 0.8, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            this.ctx.fill();
        }

        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        } else {
            // Фолбэк (желтый круг), если спрайт не загрузился
            this.ctx.fillStyle = '#f7d51d';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    /** Детальная отрисовка одной трубы с "шапкой" */
    drawPipeRect(x, y, w, h, isTop) {
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeRect(x, y, w, h);
        
        const capH = 30;
        const capW = 10;
        
        this.ctx.fillStyle = '#73bf2e';
        if (isTop) {
            this.ctx.fillRect(x - capW/2, y + h - capH, w + capW, capH);
            this.ctx.strokeRect(x - capW/2, y + h - capH, w + capW, capH);
        } else {
            this.ctx.fillRect(x - capW/2, y, w + capW, capH);
            this.ctx.strokeRect(x - capW/2, y, w + capW, capH);
        }
    }

    /** Конец игры */
    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
        if (this.onGameOver) this.onGameOver(this.score, this.reviveUsed);
    }

    /** Игровой цикл (60 FPS) */
    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }

    /** Полная очистка памяти при выходе из игры */
    destroy() {
        this.isRunning = false;
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
    }
}