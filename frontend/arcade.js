/**
 * arcade.js - НЕЗАВИСИМЫЙ АРКАДНЫЙ РЕЖИМ
 * Полная автономия: свои монеты, способности и динамическая физика.
 */
export class ArcadeGame {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        // --- СОСТОЯНИЕ (Динамическое для Аркады) ---
        this.bird = { x: 50, y: 0, size: 34, velocity: 0, rotation: 0 }; 
        this.pipes = [];
        this.coins = [];
        this.items = [];
        this.score = 0;
        
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false;
        this.shieldActive = false; // Щит из инвентаря

        // Таймеры способностей
        this.activePowerups = { shield: 0, magnet: 0, ghost: 0, gap: 0 };

        // Настройки аркады
        this.config = {
            itemChance: 0.3,
            magnetRadius: 200,
            powerupDuration: 420, // ~7 секунд
            ghostOpacity: 0.5
        };

        this.birdSprites = [];
        ['bird1.png', 'bird2.png', 'bird3.png'].forEach(src => {
            const img = new Image();
            img.src = `/frontend/assets/${src}`;
            this.birdSprites.push(img);
        });

        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 6; 

        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.resize.bind(this);

        this.initEvents();
        this.resize();
    }

    initEvents() {
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
        this.canvas.addEventListener('mousedown', this.handleInput);
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

        this.bird.x = w / 4;
        this.gravity = h * 0.0006;
        this.jump = -h * 0.010;
        this.pipeSpeed = w * 0.007;
        this.pipeSpawnThreshold = Math.max(90, Math.floor(110 * (w / 375)));
    }

    start() {
        this.score = 0;
        this.pipes = [];
        this.coins = [];
        this.items = [];
        this.activePowerups = { shield: 0, magnet: 0, ghost: 0, gap: 0 };
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.size = 34; // Сброс размера
        this.itemTimer = 0;
        this.isRunning = true;
        this.loop();
    }

    spawnPipe() {
        // Бонус GAP увеличивает проход
        const currentGap = this.activePowerups.gap > 0 
            ? window.innerHeight * 0.21 
            : window.innerHeight * 0.11;

        const minH = 100;
        const maxH = window.innerHeight - currentGap - 100;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        const p = { x: window.innerWidth, width: 75, top: h, bottom: h + currentGap, passed: false };
        this.pipes.push(p);

        // Всегда монета в трубе
        this.coins.push({
            x: p.x + p.width / 2,
            y: p.top + (currentGap / 2),
            collected: false,
            angle: 0
        });
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        // Динамика сложности: если счет > 50, птица чуть меньше, а гравитация выше
        if (this.score > 50) {
            this.bird.size = 30;
            this.gravity = (window.innerHeight * 0.0006) * 1.1;
        }

        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Таймеры бонусов
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) this.activePowerups[key]--;
        });

        // Спавн летящих бонусов
        this.itemTimer++;
        if (this.itemTimer > 300) {
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            this.items.push({
                x: window.innerWidth + 50,
                y: Math.random() * (window.innerHeight - 300) + 150,
                type: types[Math.floor(Math.random() * types.length)],
                osc: 0
            });
            this.itemTimer = 0;
        }

        this.updateElements();
        this.checkCollisions();
    }

    updateElements() {
        // Движение труб
        this.pipes.forEach(p => p.x -= this.pipeSpeed);
        
        // Монеты + Магнит
        this.coins.forEach(c => {
            c.x -= this.pipeSpeed;
            c.angle += 0.1;
            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - c.x, this.bird.y - c.y);
                if (dist < this.config.magnetRadius) {
                    c.x += (this.bird.x - c.x) * 0.2;
                    c.y += (this.bird.y - c.y) * 0.2;
                }
            }
        });

        // Бонусы
        this.items.forEach(it => {
            it.x -= this.pipeSpeed;
            it.osc += 0.05;
            it.y += Math.sin(it.osc) * 2;
        });

        // Очистка памяти
        this.pipes = this.pipes.filter(p => p.x > -p.width);
        this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
        this.items = this.items.filter(it => it.x > -50);
        
        if (this.tickCount++ > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.tickCount = 0;
        }
    }

    checkCollisions() {
        const b = this.bird;
        const pad = 10;

        // Столкновение с трубами
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            const hitX = b.x + b.size - pad > p.x && b.x + pad < p.x + p.width;
            const hitY = b.y + pad < p.top || b.y + b.size - pad > p.bottom;

            if (hitX && hitY) {
                if (this.activePowerups.ghost > 0) continue;
                if (this.activePowerups.shield > 0 || this.shieldActive) {
                    this.activePowerups.shield = 0;
                    this.shieldActive = false;
                    this.pipes.splice(i, 1);
                    continue;
                }
                this.gameOver();
            }

            if (!p.passed && p.x + p.width < b.x) {
                p.passed = true;
                this.score++;
                document.getElementById('score-overlay').innerText = this.score;
            }
        }

        // Сбор монет и бонусов
        const bX = b.x + b.size/2, bY = b.y + b.size/2;
        this.coins.forEach(c => {
            if (!c.collected && Math.hypot(bX - c.x, bY - c.y) < 40) {
                c.collected = true;
                if (window.state) window.state.coins++;
            }
        });
        this.items.forEach((it, idx) => {
            if (Math.hypot(bX - it.x, bY - it.y) < 45) {
                this.activePowerups[it.type] = this.config.powerupDuration;
                this.items.splice(idx, 1);
            }
        });

        if (b.y + b.size > window.innerHeight || b.y < -100) this.gameOver();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Трубы
        this.ctx.fillStyle = '#73bf2e';
        this.pipes.forEach(p => {
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            this.ctx.fillRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
        });

        // Монеты
        this.coins.forEach(c => {
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.scale(Math.cos(c.angle), 1);
            this.ctx.fillStyle = "#FFD700";
            this.ctx.beginPath(); this.ctx.arc(0, 0, 12, 0, Math.PI*2); this.ctx.fill();
            this.ctx.restore();
        });

        // Предметы
        this.ctx.font = "30px Arial";
        this.items.forEach(it => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            this.ctx.fillText(icons[it.type], it.x - 15, it.y + 10);
        });

        // Птица
        this.ctx.save();
        if (this.activePowerups.ghost > 0) this.ctx.globalAlpha = 0.5;
        this.ctx.translate(b.x + b.size/2, b.y + b.size/2);
        
        if (this.activePowerups.shield > 0 || this.shieldActive) {
            this.ctx.beginPath(); this.ctx.arc(0,0, b.size*0.8, 0, Math.PI*2);
            this.ctx.strokeStyle = "cyan"; this.ctx.stroke();
        }

        const img = this.birdSprites[0]; // Упростил для примера
        if (img) this.ctx.drawImage(img, -b.size/2, -b.size/2, b.size, b.size);
        this.ctx.restore();
    }

    gameOver() {
        this.isRunning = false;
        this.onGameOver(this.score);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    handleInput() { this.bird.velocity = this.jump; }
}