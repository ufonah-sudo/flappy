export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        this.bird = { x: 50, y: 0, size: 34, velocity: 0, rotation: 0 }; 
        this.pipes = [];
        this.score = 0;
        
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false;

        // Эффекты
        this.shieldActive = false; // Визуальный эффект щита в полете
        
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
        this.ctx.scale(dpr, dpr);
        
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
        
        // ПРОВЕРКА ЩИТА: Если у игрока есть щиты в инвентаре, активируем один на этот забег
        if (window.state?.powerups?.shield > 0) {
            this.shieldActive = true;
            window.state.powerups.shield--; // Тратим сразу при старте
            if (window.updateGlobalUI) window.updateGlobalUI(); 
        } else {
            this.shieldActive = false;
        }

        this.score = 0;
        this.updateScoreUI();
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.isRunning = true;
        this.loop();
    }

    revive() {
        this.reviveUsed = true;
        this.isRunning = true;
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 150);
        if (this.bird.y > window.innerHeight) this.bird.y = window.innerHeight / 2;
        this.bird.velocity = this.jump * 0.7;
        this.bird.rotation = 0;
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
        if (this.isRunning) e.preventDefault();
        this.flap();
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.flap();
        }
    }

    spawnPipe() {
        const gap = window.innerHeight * 0.28;
        const minH = 100;
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

        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.15)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;

        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        this.pipeSpawnTimer = (this.pipeSpawnTimer || 0) + 1;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.pipeSpeed;

            const pad = 8; 
            if (
                this.bird.x + this.bird.size - pad > p.x && 
                this.bird.x + pad < p.x + p.width &&
                (this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom)
            ) {
                // ЛОГИКА ЩИТА
                if (this.shieldActive) {
                    this.shieldActive = false; // Ломаем щит
                    this.pipes.splice(i, 1); // Удаляем трубу, об которую ударились
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

        if (this.bird.y + this.bird.size > window.innerHeight || this.bird.y < -150) {
            this.gameOver();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        this.pipes.forEach(p => {
            this.ctx.fillStyle = '#73bf2e';
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 3;
            this.drawPipeRect(p.x, 0, p.width, p.top, true);
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false);
        });

        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        // Рисуем свечение щита, если он активен
        if (this.shieldActive) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size * 0.8, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
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