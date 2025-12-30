/**
 * game.js - КЛАССИЧЕСКИЙ РЕЖИМ (СУХОЙ КОД)
 */
export class Game {
    constructor(canvas, onGameOver) {
        // --- ИНИЦИАЛИЗАЦИЯ ХОЛСТА ---
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver; 
        
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
        this.reviveUsed = false;

        // --- ЗАГРУЗКА СПРАЙТОВ ПТИЦЫ ---
        this.birdSprites = [];
        const sources = ['bird1.png', 'bird2.png', 'bird3.png'];
        sources.forEach(src => {
            const img = new Image();
            img.src = `/frontend/assets/${src}`; 
            this.birdSprites.push(img);
        });

        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 6; 

        // --- ПРИВЯЗКА КОНТЕКСТА ---
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

        // ПУНКТ 6: АДАПТАЦИЯ ПОД ПК
        // Если экран высокий (ПК), не даем параметрам расти бесконечно
        const isDesktop = h > 800;

        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;
        
        // Ограничиваем гравитацию на больших экранах, иначе падает камнем
        this.gravity = isDesktop ? 0.45 : h * 0.0006;   
        this.jump = isDesktop ? -7 : -h * 0.010;      
        
        // Скорость труб тоже ограничиваем
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

        this.updateScoreUI();
        this.isRunning = true;
        this.loop();
    }

    revive() {
        this.reviveUsed = true;
        this.isRunning = true;
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 200);
        if (this.bird.y > window.innerHeight || this.bird.y < 0) {
            this.bird.y = window.innerHeight / 2;
        }
        this.bird.velocity = this.jump * 0.8; 
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
        // ПУНКТ 6: ФИКС ПРОЕМОВ ДЛЯ ПК
        // На телефоне - процент от высоты, на ПК - фиксированный размер (180px)
        let gap = window.innerHeight > 800 ? 190 : window.innerHeight * 0.06; 
        
        const minH = 100;
        const maxH = window.innerHeight - gap - minH;
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

            // КОЛЛИЗИЯ БЕЗ ПОБЛАЖЕК
            const pad = 10;
            const hitX = this.bird.x + this.bird.size - pad > p.x && this.bird.x + pad < p.x + p.width;
            const hitY = this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom;

            if (hitX && hitY) {
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

        if (this.bird.y + this.bird.size > window.innerHeight || this.bird.y < -100) {
            this.gameOver();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Цвета как в Аркаде
        const pipeColor = '#07e358ff';    // Темный хаки
        const capColor = '#05ba41ff';     // Оливковый для шапок
        const strokeColor = '#0d3018ff';  // Темный контур

        this.pipes.forEach(p => {
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = strokeColor;

            // Рисуем верхнюю трубу
            this.drawPipeRect(p.x, 0, p.width, p.top, true, pipeColor, capColor);
            
            // Рисуем нижнюю трубу
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false, pipeColor, capColor);
        });

        // Отрисовка птицы
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();
    }

    drawPipeRect(x, y, w, h, isTop, pipeColor, capColor) {
        // 1. Рисуем тело трубы
        this.ctx.fillStyle = pipeColor;
        this.ctx.fillRect(x, y, w, h);
        
        // Добавляем блик слева для объема
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.fillRect(x + 8, y, 10, h);
        
        // Контур тела
        this.ctx.strokeRect(x, y, w, h);

        // 2. Параметры шапки
        const capH = 25; // Высота шапки
        const capW = 10; // На сколько шапка шире тела трубы
        
        // Определяем Y координату для шапки
        const capY = isTop ? (y + h - capH) : y;

        // Рисуем шапку
        this.ctx.fillStyle = capColor;
        this.ctx.fillRect(x - capW/2, capY, w + capW, capH);
        
        // Блик на шапке
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(x - capW/2 + 8, capY, 10, capH);
        
        // Контур шапки
        this.ctx.strokeRect(x - capW/2, capY, w + capW, capH);
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
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