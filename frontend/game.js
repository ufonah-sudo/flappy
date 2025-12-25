export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        // Настройки птицы (размер 34 - ок)
        this.bird = { x: 50, y: 0, size: 34, velocity: 0, rotation: 0 }; 
        this.pipes = [];
        this.score = 0;
        
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

        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 6; 

        // Физика
        this.gravity = 0;
        this.jump = 0;
        this.pipeSpeed = 0;
        
        this.pipeSpawnTimer = 0;
        this.pipeSpawnThreshold = 100;
        this.animationId = null;

        // Привязка методов
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleResize = this.resize.bind(this);

        // События
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('resize', this.handleResize);
        
        this.resize();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        // Защита от нулевых значений при инициализации
        const w = window.innerWidth > 0 ? window.innerWidth : 375;
        const h = window.innerHeight > 0 ? window.innerHeight : 667;

        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Более надежный scale
        
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;
        
        // Физика под высоту экрана
        this.gravity = h * 0.00055;
        this.jump = -h * 0.011;
        this.pipeSpeed = w * 0.0065;

        this.pipeSpawnThreshold = Math.floor(100 * (w / 400));
        this.pipeSpawnThreshold = Math.max(80, Math.min(150, this.pipeSpawnThreshold));
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
        
        this.loop();
    }

    revive() {
        this.reviveUsed = true;
        // Очистка пути
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 300 || p.x < this.bird.x - 50);
        this.bird.velocity = this.jump * 0.7; // Мягкий подброс
        this.bird.y = Math.max(100, this.bird.y); // Не даем возродиться в полу
        this.isRunning = true;
        this.loop();
    }

    flap() {
        if (!this.isRunning || this.isPaused) return;
        this.bird.velocity = this.jump;
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

    spawnPipe() {
        const gap = window.innerHeight * 0.28; // Оптимальная щель
        const minH = 80;
        const maxH = window.innerHeight - gap - minH;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        this.pipes.push({
            x: window.innerWidth,
            width: 70, 
            top: h,
            bottom: h + gap,
            passed: false
        });
    }

    update() {
        if (!this.isRunning) return;

        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Плавный поворот
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.1)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.2;

        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.pipeSpeed;

            // Коллизия
            const pad = 6; 
            if (
                this.bird.x + this.bird.size - pad > p.x && 
                this.bird.x + pad < p.x + p.width &&
                (this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom)
            ) {
                this.gameOver();
                return;
            }

            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }

            if (p.x < -p.width) this.pipes.splice(i, 1);
        }

        if (this.bird.y + this.bird.size > window.innerHeight || this.bird.y < -50) {
            this.gameOver();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // Трубы
        this.pipes.forEach(p => {
            const grad = this.ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
            grad.addColorStop(0, '#558021');
            grad.addColorStop(0.5, '#98e346');
            grad.addColorStop(1, '#558021');

            this.ctx.fillStyle = grad;
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 2;

            // Верх
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            this.ctx.strokeRect(p.x, -2, p.width, p.top + 2);
            
            // Низ
            this.ctx.fillRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
            this.ctx.strokeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
        });

        // Птица
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        } else {
            this.ctx.fillStyle = '#f7d51d';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
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