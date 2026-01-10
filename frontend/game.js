/**
 * game.js - КЛАССИЧЕСКИЙ РЕЖИМ (СУХОЙ КОД)
 */
export class Game {

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

        this.bird = { 
            x: 50, 
            y: 0, 
            size: 45, // Увеличили размер птицы (было 34)
            velocity: 0, 
            rotation: 0 
        }; 
        
        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false;
        this.isGhost = false; // Флаг неуязвимости

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
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        const isDesktop = h > 800;
        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;
        
        this.gravity = isDesktop ? 0.45 : h * 0.0006;   
        this.jump = isDesktop ? -10 : -h * 0.014;       
        this.pipeSpeed = isDesktop ? 4 : w * 0.007;  
        this.pipeSpawnThreshold = Math.max(10, Math.floor(110 * (w / 375)));
    }

    start() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0;
        this.reviveUsed = false;
        this.isGhost = false;
        this.updateScoreUI();
        this.isRunning = true;
        this.loop();
    }

    /**
     * Возрождение без сброса прогресса
     */
    revive() {
        this.isRunning = true;
        this.reviveUsed = true;
        
        // Подбрасываем птицу
        this.bird.velocity = -4; 
        
        // Удаляем ближайшие трубы (чтобы не врезаться сразу)
        this.pipes = this.pipes.filter(p => p.x < this.bird.x - 100 || p.x > this.bird.x + 300);
        
        // Включаем режим призрака (неуязвимость) на 2 сек
        this.isGhost = true;
        setTimeout(() => { this.isGhost = false; }, 2000);
        
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
        let gap = window.innerHeight > 800 ? 190 : window.innerHeight * 0.15; 
        const minAllowedY = window.innerHeight / 5; 
        const minH = minAllowedY; 
        const bottomLimit = 100;
        const maxH = window.innerHeight - gap - bottomLimit;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;
        
        this.pipes.push({
            x: window.innerWidth,
            width: 75, 
            top: h,
            bottom: h + gap,
            passed: false
        });
    }

    update() {
        if (!this.isRunning || this.isPaused) return;
        
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;
        
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.2)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;
        
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
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
        this.pipeSpawnTimer = (this.pipeSpawnTimer || 0) + 1;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // Движение и коллизии
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.pipeSpeed;

            const pad = 10;
            const hitX = this.bird.x + this.bird.size - pad > p.x && this.bird.x + pad < p.x + p.width;
            const hitY = this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom;

            if (hitX && hitY) {
                // Если призрак (после ревайва), то не умираем
                if (this.isGhost) continue;
                
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
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const pipeColor = '#07e358ff'; 
        const capColor = '#05ba41ff'; 
        const strokeColor = '#0d3018ff';

        this.pipes.forEach(p => {
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = strokeColor;
            this.drawPipeRect(p.x, 0, p.width, p.top, true, pipeColor, capColor);
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false, pipeColor, capColor);
        });

        this.drawGround();

        // Отрисовка птицы
        this.ctx.save();
        
        // Если призрак — делаем полупрозрачной
        if (this.isGhost) {
            this.ctx.globalAlpha = 0.5;
        }
        
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);
        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        }
        
        this.ctx.restore(); // Сбрасываем прозрачность и поворот
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

    drawPipeRect(x, y, w, h, isTop, pipeColor, capColor) {
        this.ctx.fillStyle = pipeColor;
        this.ctx.fillRect(x, y, w, h);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.fillRect(x + 8, y, 10, h);
        
        this.ctx.strokeRect(x, y, w, h);
        
        const capH = 25; 
        const capW = 10; 
        const capY = isTop ? (y + h - capH) : y;
        
        this.ctx.fillStyle = capColor;
        this.ctx.fillRect(x - capW/2, capY, w + capW, capH);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(x - capW/2 + 8, capY, 10, capH);
        
        this.ctx.strokeRect(x - capW/2, capY, w + capW, capH);
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;

         // 👇 ВОТ ЗДЕСЬ ОБНОВЛЯЕМ ПРОГРЕСС 👇
        try {
            const flyTask = window.state?.user?.daily_challenges?.find(c => c.id.startsWith('fly_'));
            // Если такое задание есть, и мы побили старый рекорд
            if (flyTask && this.score > (flyTask.progress || 0)) {
                // Записываем наш итоговый счет как прогресс
                flyTask.progress = this.score;
            }
        } catch(e) {
            console.error("Ошибка обновления задания 'fly'", e);
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