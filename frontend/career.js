/**
 * career.js - УЛУЧШЕННЫЙ ДВИЖОК КАРЬЕРЫ
 */
export class CareerGame {
    constructor(canvas, onWin, onLose) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onWin = onWin;
        this.onLose = onLose;

        this.ground = { img: new Image(), offsetX: 0, h: 100, realWidth: 512 };
        this.ground.img.src = '/frontend/assets/ground.png';

        this.bird = { x: 50, y: 0, size: 45, velocity: 0, rotation: 0 };
        this.birdSprites = [];
        ['bird1.png', 'bird2.png', 'bird3.png'].forEach(src => {
            const img = new Image();
            img.src = `/frontend/assets/${src}`;
            this.birdSprites.push(img);
        });

        this.bgImage = new Image();
        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        this.pipeSpawnTimer = 0; // Таймер для точного спавна

        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.resize.bind(this);

        this.initEvents();
        this.resize();
    }

    initEvents() {
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
        window.addEventListener('resize', this.handleResize);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        // Адаптивная физика
        this.gravity = h > 800 ? 0.45 : h * 0.0006;
        this.jump = h > 800 ? -8 : -h * 0.012; 
        this.bird.x = w / 4;
    }

    startLevel(config) {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.config = config;
        this.score = 0;
        this.pipes = [];
        this.pipeSpawnTimer = 0;
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.isRunning = true;
        
        if (config.bg) this.bgImage.src = `/frontend/assets/${config.bg}`;
        this.loop();
    }

    handleInput(e) {
        if (!this.isRunning) return;
        if (e && e.cancelable) e.preventDefault();
        
        // ЗВУК ПРЫЖКА
        if (window.audioManager) window.audioManager.playSound('flap');
        
        this.bird.velocity = this.jump;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    update() {
        if (!this.isRunning) return;

        const speed = this.config.speed || 3;

        // 1. Физика птицы
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.2)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;

        // 2. Анимация крыльев
        this.tickCount = (this.tickCount || 0) + 1;
        if (this.tickCount > 6) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // 3. Спавн труб по дистанции, а не по тикам
        this.pipeSpawnTimer += speed;
        // Расстояние между трубами примерно 250-300 пикселей
        if (this.pipeSpawnTimer > 280) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // 4. Земля
        this.ground.offsetX -= speed;
        if (this.ground.offsetX <= -this.ground.realWidth) this.ground.offsetX = 0;

        // Смерть об пол
        if (this.bird.y + this.bird.size > window.innerHeight - this.ground.h) {
            this.lose();
            return;
        }

        // 5. Обработка труб
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= speed;

            // Коллизия
            const pad = 10;
            const hitX = this.bird.x + this.bird.size - pad > p.x && this.bird.x + pad < p.x + p.width;
            const hitY = this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom;

            if (hitX && hitY) {
                this.lose();
                return;
            }

            // Очки и Победа
            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                if (window.audioManager) window.audioManager.playSound('point');

                if (this.score >= this.config.target) {
                    this.win();
                    return;
                }
            }
            if (p.x < -100) this.pipes.splice(i, 1);
        }
    }

    spawnPipe() {
        const gap = this.config.gap || 150;
        const minH = 100;
        const maxH = window.innerHeight - gap - this.ground.h - 50;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        this.pipes.push({ x: window.innerWidth, width: 70, top: h, bottom: h + gap, passed: false });
    }

    // РИСОВАНИЕ БЕЗ ИЗМЕНЕНИЙ (как в твоем исходнике)
    draw() { /* ... твой метод draw с прогресс-баром ... */ }

    win() {
        this.isRunning = false;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        if (this.onWin) this.onWin(this.config.id);
    }

    lose() {
        this.isRunning = false;
        if (window.audioManager) window.audioManager.playSound('hit');
        if (this.onLose) this.onLose(this.score);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }
}