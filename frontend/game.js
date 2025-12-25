export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        // Настройки птицы
        this.bird = { x: 50, y: 0, size: 34, velocity: 0, rotation: 0 }; // Уменьшил размер для лучшего геймплея
        this.pipes = [];
        this.score = 0;
        
        // Состояние
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false;
        
        // --- ЗАГРУЗКА СПРАЙТОВ ---
        this.birdSprites = [];
        const sources = ['bird1.png', 'bird2.png', 'bird3.png'];
        sources.forEach(src => {
            const img = new Image();
            img.src = `assets/${src}`;
            this.birdSprites.push(img);
        });

        // Анимация спрайта
        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 6; 

        // Физика (инициализируется в resize)
        this.gravity = 0;
        this.jump = 0;
        this.pipeSpeed = 0;
        
        // Таймеры
        this.pipeSpawnTimer = 0;
        this.pipeSpawnThreshold = 100;
        this.animationId = null;

        // --- ПРИВЯЗКА МЕТОДОВ (Чтобы не терять this) ---
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleResize = this.resize.bind(this);

        // Привязка событий
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('resize', this.handleResize);
        
        this.resize();
    }

    resize() {
        // Учитываем devicePixelRatio для четкости на Retina-экранах
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        
        // Визуальный размер канваса (CSS)
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';

        this.bird.x = window.innerWidth / 4; 
        if (!this.isRunning) this.bird.y = window.innerHeight / 2;
        
        // Адаптивная физика
        this.gravity = window.innerHeight * 0.0006;
        this.jump = -window.innerHeight * 0.0115;
        this.pipeSpeed = window.innerWidth * 0.007;

        this.pipeSpawnThreshold = Math.floor(110 * (window.innerWidth / 400));
        this.pipeSpawnThreshold = Math.max(90, Math.min(180, this.pipeSpawnThreshold));
    }

    start() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.reviveUsed = false;
        this.isRunning = true;
        this.isPaused = false;
        
        this.playSound('start');
        this.loop();
    }

    revive() {
        this.reviveUsed = true;
        // Очищаем трубы в радиусе 400 пикселей впереди
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 400 || p.x < this.bird.x - 50);
        this.bird.velocity = -2; // Небольшой подброс при возрождении
        this.isRunning = true;
        this.loop();
    }

    flap() {
        if (!this.isRunning) return;
        this.bird.velocity = this.jump;
        this.playSound('flap');
    }

    handleInput(e) {
        if (this.isRunning && e.cancelable) e.preventDefault();
        this.flap();
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.flap();
        }
    }

    playSound(type) {
        const soundEnabled = localStorage.getItem('sound') !== 'off';
        if (!soundEnabled) return;
        // Реализация звука...
    }

    spawnPipe() {
        const gap = window.innerHeight * 0.30; // Чуть увеличил просвет для баланса
        const minPipeHeight = 100;
        const maxPipeHeight = window.innerHeight - gap - minPipeHeight;
        const pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;

        this.pipes.push({
            x: window.innerWidth,
            width: 70, 
            top: pipeHeight,
            bottom: pipeHeight + gap,
            passed: false
        });
    }

    update() {
        if (!this.isRunning) return;

        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Поворот птицы
        const targetRotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 8, (this.bird.velocity * 0.08)));
        this.bird.rotation += (targetRotation - this.bird.rotation) * 0.3;

        // Анимация крыльев
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // Трубы
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // Хитбокс (уменьшен для честности игры)
            const p = 6; 
            if (
                this.bird.x + this.bird.size - p > pipe.x && 
                this.bird.x + p < pipe.x + pipe.width &&
                (this.bird.y + p < pipe.top || this.bird.y + this.bird.size - p > pipe.bottom)
            ) {
                this.gameOver();
                return;
            }

            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.playSound('score');
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }

            if (pipe.x < -pipe.width) this.pipes.splice(i, 1);
        }

        // Столкновение с краями
        if (this.bird.y + this.bird.size > window.innerHeight || this.bird.y < 0) {
            this.gameOver();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // Отрисовка труб
        this.pipes.forEach(pipe => {
            const grad = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            grad.addColorStop(0, '#558021');
            grad.addColorStop(0.3, '#98e346');
            grad.addColorStop(1, '#558021');

            this.ctx.fillStyle = grad;
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#2d4c12';

            // Верхняя труба
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
            this.ctx.strokeRect(pipe.x, -2, pipe.width, pipe.top + 2);
            
            // Нижняя труба
            this.ctx.fillRect(pipe.x, pipe.bottom, pipe.width, window.innerHeight - pipe.bottom);
            this.ctx.strokeRect(pipe.x, pipe.bottom, pipe.width, window.innerHeight - pipe.bottom);
        });

        // Отрисовка птицы
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        const currentImg = this.birdSprites[this.frameIndex];
        if (currentImg && currentImg.complete) {
            this.ctx.drawImage(currentImg, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        } else {
            this.ctx.fillStyle = '#f7d51d';
            this.ctx.fillRect(-this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.playSound('hit');
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.onGameOver) this.onGameOver(this.score, this.reviveUsed);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }

    destroy() {
        this.isRunning = false;
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
    }
}