/**
 * arcade.js - АРКАДНЫЙ РЕЖИМ (СПОСОБНОСТИ)
 */
export class ArcadeGame {

    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;

        this.ground = {
            img: new Image(),
            offsetX: 0,
            h: 100, 
            realWidth: 512,
            realHeight: 162
        };
        this.ground.img.src = '/frontend/assets/ground.png';

        // Птица (Такая же большая, как в Классике)
        this.bird = { 
            x: 50, 
            y: 0, 
            size: 45, 
            velocity: 0, 
            rotation: 0 
        }; 

        this.pipes = [];
        this.coins = [];
        this.items = [];
        this.score = 0;
        
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false; // Флаг: использовали ли сердце
        this.isGhost = false;    // Флаг: неуязвимость (после удара или способности)

        this.activePowerups = { shield: 0, magnet: 0, ghost: 0, gap: 0 };
        
        this.config = {
            itemChance: 0.3,
            magnetRadius: 250, // Увеличил радиус магнита
            powerupDuration: 420
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
        this.itemTimer = 0;

        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.resize.bind(this);

        this.initEvents();
        this.resize();
    }

    activatePowerupEffect(id) {
        console.log(`🚀 Powerup: ${id}`);
        switch(id) {
            case 'shield': this.activePowerups.shield = 600; break;
            case 'gap':    this.activePowerups.gap = 700; break;
            case 'ghost':  this.activePowerups.ghost = 400; break;
            case 'magnet': this.activePowerups.magnet = 700; break;
        }
    }

    initEvents() {
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            this.handleInput();
        }, { passive: false });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            this.handleInput();
        });
        
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

        const isDesktop = h > 800;
        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;

        // === ФИЗИКА (СИНХРОНИЗИРОВАНА С GAME.JS) ===
        this.gravity = isDesktop ? 0.45 : h * 0.0006;
        this.jump = isDesktop ? -9 : -h * 0.013; // Такая же амплитуда!
        
        this.pipeSpeed = isDesktop ? 4 : w * 0.008; // Чуть быстрее для драйва
        this.pipeSpawnThreshold = Math.max(80, Math.floor(100 * (w / 375)));
    }

    start() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.score = 0;
        this.pipes = [];
        this.coins = [];
        this.items = [];
        this.activePowerups = { shield: 0, magnet: 0, ghost: 0, gap: 0 };
        this.reviveUsed = false;
        this.isGhost = false;
        
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        
        this.isRunning = true;
        
        // Скрываем счет во время игры, чтобы не мешал хедеру?
        // Или обновляем его
        const scoreEl = document.getElementById('score-overlay');
        if(scoreEl) scoreEl.innerText = "0";

        this.loop();
    }

    revive() {
        this.isRunning = true;
        this.reviveUsed = true;
        
        // Подброс
        this.bird.velocity = -4; 
        
        // Чистим зону
        this.pipes = this.pipes.filter(p => p.x < this.bird.x - 100 || p.x > this.bird.x + 300);
        
        // Неуязвимость
        this.isGhost = true;
        // Важно: не сбрасываем activePowerups.ghost, а используем флаг
        setTimeout(() => { this.isGhost = false; }, 2000);
        
        this.loop();
    }

    spawnPipe() {
        const gapBase = window.innerHeight * 0.18;
        const gapLarge = window.innerHeight * 0.35; // Широкий проем стал еще шире
        
        // Если активна способность GAP
        const currentGap = this.activePowerups.gap > 0 ? gapLarge : gapBase;
        
        const minH = window.innerHeight / 5;
        const maxH = window.innerHeight - currentGap - 100;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        const p = { 
            x: window.innerWidth, 
            width: 75, 
            top: h, 
            bottom: h + currentGap, 
            passed: false 
        };
        this.pipes.push(p);

        // СПАВН МОНЕТ (Внутри труб)
        if (Math.random() > 0.3) {
            this.coins.push({
                x: p.x + 35,
                y: h + (currentGap / 2), // По центру проема
                angle: 0
            });
        }
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        // Физика
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;
        
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.2)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;

        // Анимация
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // Таймеры способностей
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) this.activePowerups[key]--;
        });

        // Спавн бонусов (Способностей)
        this.itemTimer++;
        if (this.itemTimer > 600) { // Раз в ~10 сек
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            this.items.push({
                x: window.innerWidth + 50,
                y: Math.random() * (window.innerHeight - 300) + 100,
                type: types[Math.floor(Math.random() * types.length)],
                osc: 0
            });
            this.itemTimer = 0;
        }

        // Земля
        this.ground.offsetX -= this.pipeSpeed;
        if (this.ground.offsetX <= -this.ground.realWidth) this.ground.offsetX = 0;

        // Смерть об пол
        const groundTop = window.innerHeight - this.ground.h;
        if (this.bird.y + this.bird.size > groundTop) {
            this.bird.y = groundTop - this.bird.size;
            this.gameOver();
            return;
        }

        // Спавн труб
        if (++this.tickCount > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.tickCount = 0;
        }

        // ДВИЖЕНИЕ ЭЛЕМЕНТОВ
        const speed = this.pipeSpeed;

        // 1. Трубы
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= speed;

            // Коллизия
            const pad = 10;
            const hitX = this.bird.x + this.bird.size - pad > p.x && this.bird.x + pad < p.x + p.width;
            const hitY = this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom;

            if (hitX && hitY) {
                // Если Призрак (способность) или Ревайв (временный) - живем
                if (this.activePowerups.ghost > 0 || this.isGhost) {
                    // Пролетаем сквозь
                } 
                else if (this.activePowerups.shield > 0) {
                    this.activePowerups.shield = 0; // Ломаем щит
                    this.pipes.splice(i, 1); // Ломаем трубу
                    if(window.updateGlobalUI) window.updateGlobalUI();
                    continue;
                } else {
                    this.gameOver();
                    return;
                }
            }

            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                const scoreEl = document.getElementById('score-overlay');
                if(scoreEl) scoreEl.innerText = this.score;
            }

            if (p.x < -p.width) this.pipes.splice(i, 1);
        }

        // 2. Монеты
        this.coins.forEach(c => {
            c.x -= speed;
            c.angle += 0.1;
            
            // Магнит
            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - c.x, this.bird.y - c.y);
                if (dist < this.config.magnetRadius) {
                    c.x += (this.bird.x - c.x) * 0.15;
                    c.y += (this.bird.y - c.y) * 0.15;
                }
            }
        });
        
        // Сбор монет
        const bX = this.bird.x + this.bird.size/2;
        const bY = this.bird.y + this.bird.size/2;
        
        this.coins = this.coins.filter(c => {
            if (Math.hypot(bX - c.x, bY - c.y) < 40) {
                // Собрали!
                if(window.state) {
                    window.state.coins++;
                    if(window.updateGlobalUI) window.updateGlobalUI();
                }
                return false; // Удаляем из массива
            }
            return c.x > -50; // Оставляем, если еще на экране
        });

        // 3. Бонусы (Items)
        this.items.forEach(it => {
            it.x -= speed;
            it.osc += 0.05;
            it.y += Math.sin(it.osc) * 1.5;
        });
        
        // Сбор бонусов
        this.items = this.items.filter(it => {
            if (Math.hypot(bX - it.x, bY - it.y) < 45) {
                // Активируем!
                this.activatePowerupEffect(it.type);
                if(window.updateGlobalUI) window.updateGlobalUI();
                return false;
            }
            return it.x > -50;
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const pipeColor = '#d35400'; // Аркадный цвет (Оранжевый)
        const capColor = '#e67e22'; 
        const strokeColor = '#6e2c00';

        this.pipes.forEach(p => {
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = strokeColor;
            
            // Верх
            this.ctx.fillStyle = pipeColor;
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            this.ctx.fillStyle = capColor;
            this.ctx.fillRect(p.x - 5, p.top - 25, p.width + 10, 25);
            this.ctx.strokeRect(p.x - 5, p.top - 25, p.width + 10, 25);
            this.ctx.strokeRect(p.x, 0, p.width, p.top);

            // Низ
            this.ctx.fillStyle = pipeColor;
            this.ctx.fillRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
            this.ctx.fillStyle = capColor;
            this.ctx.fillRect(p.x - 5, p.bottom, p.width + 10, 25);
            this.ctx.strokeRect(p.x - 5, p.bottom, p.width + 10, 25);
            this.ctx.strokeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
        });

        this.drawGround();

        // Монеты
        this.coins.forEach(c => {
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.scale(Math.abs(Math.cos(c.angle)), 1);
            this.ctx.fillStyle = "#FFD700";
            this.ctx.beginPath(); this.ctx.arc(0, 0, 12, 0, Math.PI*2); this.ctx.fill();
            this.ctx.strokeStyle = "#b36b15"; this.ctx.stroke();
            this.ctx.restore();
        });

        // Бонусы
        this.ctx.font = "35px Arial";
        this.items.forEach(it => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            this.ctx.fillText(icons[it.type] || '🎁', it.x - 15, it.y + 10);
        });

        // Птица
        this.ctx.save();
        // Эффекты на птице
        if (this.isGhost || this.activePowerups.ghost > 0) this.ctx.globalAlpha = 0.5;
        
        if (this.activePowerups.shield > 0) {
            this.ctx.beginPath();
            this.ctx.arc(this.bird.x + this.bird.size/2, this.bird.y + this.bird.size/2, this.bird.size, 0, Math.PI*2);
            this.ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        this.ctx.translate(this.bird.x + this.bird.size/2, this.bird.y + this.bird.size/2);
        this.ctx.rotate(this.bird.rotation);
        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size/2, -this.bird.size/2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();
    }

    drawGround() {
        const ctx = this.ctx;
        const g = this.ground;
        const y = window.innerHeight - g.h;
        if (g.img.complete) {
            for (let i = 0; i <= Math.ceil(this.canvas.width / g.realWidth) + 1; i++) {
                ctx.drawImage(g.img, i * g.realWidth + g.offsetX, y, g.realWidth, g.h);
            }
        }
    }

    handleInput(e) {
        if (!this.isRunning || this.isPaused) return;
        if (e && e.type === 'touchstart') e.preventDefault();
        
        this.bird.velocity = this.jump; // Теперь прыжок такой же сильный
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
        
        // Скрываем панель способностей
        const panel = document.querySelector('.arcade-powers-layout');
        if (panel) panel.style.display = 'none';
        
        if (this.onGameOver) this.onGameOver(this.score, this.reviveUsed);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }
}
