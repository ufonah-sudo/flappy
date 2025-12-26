export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        // Базовые параметры птицы
        this.bird = { x: 50, y: 0, size: 34, velocity: 0, rotation: 0 }; 
        this.pipes = [];
        this.score = 0;
        
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false;
        this.shieldActive = false; 

        // Загрузка спрайтов
        this.birdSprites = [];
        const sources = ['bird1.png', 'bird2.png', 'bird3.png'];
        sources.forEach(src => {
            const img = new Image();
            img.src = `assets/${src}`; // Убедись, что путь верный
            this.birdSprites.push(img);
        });

        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 6; 

        // Привязка контекста
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleResize = this.resize.bind(this);

        this.initEvents();
        this.resize();
    }

    initEvents() {
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('resize', this.handleResize);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Более надежный способ масштабирования
        
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;
        
        this.gravity = h * 0.00045;
        this.jump = -h * 0.010;
        this.pipeSpeed = w * 0.0055;
        this.pipeSpawnThreshold = Math.max(90, Math.floor(110 * (w / 375)));
    }

    start() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        // СБРОС СОСТОЯНИЯ (Чтобы аркада не текла в классику)
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;

        // ЛОГИКА ЩИТА (Только если есть в глобальном состоянии)
        if (window.state?.powerups?.shield > 0) {
            this.shieldActive = true;
            window.state.powerups.shield--; 
            if (window.updateGlobalUI) window.updateGlobalUI(); 
        } else {
            this.shieldActive = false;
        }

        this.updateScoreUI();
        this.isRunning = true;
        this.loop();
    }

    updateScoreUI() {
        const scoreEl = document.getElementById('score-overlay');
        if (scoreEl) scoreEl.innerText = this.score;
    }

    flap() {
        if (!this.isRunning || this.isPaused) return;
        this.bird.velocity = this.jump;
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

    spawnPipe() {
        // Gap может быть переопределен в ArcadeGame
        const currentGap = this.gap || window.innerHeight * 0.28;
        const minH = 100;
        const maxH = window.innerHeight - currentGap - minH;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        this.pipes.push({
            x: window.innerWidth,
            width: 70, 
            top: h,
            bottom: h + currentGap,
            passed: false
        });
    }

    update() {
        if (!this.isRunning) return;

        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Вращение
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.15)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;

        // Анимация крыльев
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // Спавн труб
        this.pipeSpawnTimer = (this.pipeSpawnTimer || 0) + 1;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // Обновление труб
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.pipeSpeed;

            // Коллизии
            const pad = 8; 
            if (
                this.bird.x + this.bird.size - pad > p.x && 
                this.bird.x + pad < p.x + p.width &&
                (this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom)
            ) {
                if (this.shieldActive) {
                    this.shieldActive = false; 
                    this.pipes.splice(i, 1);
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
                    }
                    continue; 
                }
                this.gameOver();
                return;
            }

            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                this.updateScoreUI();
            }

            if (p.x < -p.width) this.pipes.splice(i, 1);
        }

        // Смерть от границ
        if (this.bird.y + this.bird.size > window.innerHeight || this.bird.y < -150) {
            this.gameOver();
        }
    }

    draw() {
        // Очистка
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Трубы
        this.pipes.forEach(p => {
            this.ctx.fillStyle = '#73bf2e';
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 3;
            this.drawPipeRect(p.x, 0, p.width, p.top, true);
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false);
        });

        // Птица
        this.ctx.save();
        // В Аркаде globalAlpha может быть < 1
        if (this.activePowerups?.ghost > 0) this.ctx.globalAlpha = 0.5;

        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        if (this.shieldActive) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size * 0.8, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
            this.ctx.fill();
        }

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

    drawPipeRect(x, y, w, h, isTop) {
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeRect(x, y, w, h);
        const capH = 25;
        const capW = 10;
        if (isTop) {
            this.ctx.fillRect(x - capW/2, y + h - capH, w + capW, capH);
            this.ctx.strokeRect(x - capW/2, y + h - capH, w + capW, capH);
        } else {
            this.ctx.fillRect(x - capW/2, y, w + capW, capH);
            this.ctx.strokeRect(x - capW/2, y, w + capW, capH);
        }
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
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