/**
 * ДВИЖОК РЕЖИМА КАРЬЕРЫ
 * Отличается от классики наличием Цели, Прогресс-бара и Победы.
 */
export class CareerGame {

    constructor(canvas, onWin, onLose) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onWin = onWin;   // Колбек победы
        this.onLose = onLose; // Колбек поражения

        // Земля (общая для всех)
        this.ground = {
            img: new Image(),
            offsetX: 0,
            h: 100,
            realWidth: 512
        };
        this.ground.img.src = '/frontend/assets/ground.png';

        // Птица
        this.bird = { x: 50, y: 0, size: 34, velocity: 0, rotation: 0 };
        
        // Спрайты птицы
        this.birdSprites = [];
        ['bird1.png', 'bird2.png', 'bird3.png'].forEach(src => {
            const img = new Image();
            img.src = `/frontend/assets/${src}`;
            this.birdSprites.push(img);
        });
        this.frameIndex = 0;
        this.tickCount = 0;

        // Фон уровня (будет меняться)
        this.bgImage = new Image();

        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        
        // Привязки
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
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';

        // Физика (адаптивная)
        const h = window.innerHeight;
        this.gravity = h > 800 ? 0.45 : h * 0.0006;
        this.jump = h > 800 ? -7 : -h * 0.010;
        
        this.bird.x = window.innerWidth / 4;
        if (!this.isRunning) this.bird.y = h / 2;
    }

    /**
     * ЗАПУСК УРОВНЯ
     * @param {Object} config - настройки из levels.js (target, speed, gap, bg...)
     */
    startLevel(config) {
        if (this.animationId) cancelAnimationFrame(this.animationId);

        this.config = config;
        this.score = 0;
        this.pipes = [];
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.isRunning = true;
        
        // Загружаем фон уровня
        if (config.bg) {
            this.bgImage.src = `/frontend/assets/${config.bg}`;
        }

        this.loop();
    }

    handleInput(e) {
        if (!this.isRunning) return;
        if (e && e.type === 'touchstart') e.preventDefault();
        
        this.bird.velocity = this.jump;
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    spawnPipe() {
        const gap = this.config.gap || 150; // Проем из конфига уровня
        const minH = window.innerHeight / 5;
        const maxH = window.innerHeight - gap - 120;
        
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

        // 1. Физика птицы
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;
        
        // Вращение
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.2)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;

        // Анимация крыльев
        this.tickCount++;
        if (this.tickCount > 6) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // 2. Земля
        const speed = this.config.speed || 3;
        this.ground.offsetX -= speed;
        if (this.ground.offsetX <= -this.ground.realWidth) this.ground.offsetX = 0;

        // Смерть об пол
        if (this.bird.y + this.bird.size > window.innerHeight - this.ground.h) {
            this.lose();
            return;
        }

        // 3. Трубы
        if (this.tickCount % 100 === 0 || this.pipes.length === 0 && this.tickCount > 20) {
             // Простая логика спавна (можно усложнить)
             if (this.pipes.length === 0 || window.innerWidth - this.pipes[this.pipes.length-1].x > 200) {
                 this.spawnPipe();
             }
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= speed;

            // Коллизия
            const pad = 8;
            const hitX = this.bird.x + this.bird.size - pad > p.x && this.bird.x + pad < p.x + p.width;
            const hitY = this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom;

            if (hitX && hitY) {
                this.lose();
                return;
            }

            // Прохождение трубы
            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                
                // ПРОВЕРКА ПОБЕДЫ
                if (this.score >= this.config.target) {
                    this.win();
                    return;
                }
            }

            if (p.x < -100) this.pipes.splice(i, 1);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Фон (если загрузился)
        if (this.bgImage.complete && this.bgImage.src) {
            this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
        }

        // 2. Трубы
        const pColor = this.config.pipeColor || '#75b85b';
        this.pipes.forEach(p => {
            this.ctx.fillStyle = pColor;
            this.ctx.strokeStyle = '#2d3419';
            this.ctx.lineWidth = 2;
            
            // Верх
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            this.ctx.strokeRect(p.x, 0, p.width, p.top);
            
            // Низ
            this.ctx.fillRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
            this.ctx.strokeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
        });

        // 3. Земля
        const g = this.ground;
        const y = window.innerHeight - g.h;
        if (g.img.complete) {
            for (let i = 0; i <= Math.ceil(this.canvas.width / g.realWidth) + 1; i++) {
                this.ctx.drawImage(g.img, i * g.realWidth + g.offsetX, y, g.realWidth, g.h);
            }
        }

        // 4. Птица
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.size/2, this.bird.y + this.bird.size/2);
        this.ctx.rotate(this.bird.rotation);
        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size/2, -this.bird.size/2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();

        // 5. ПРОГРЕСС БАР (Сверху)
        this.drawProgress();
    }

    drawProgress() {
        const w = 200;
        const h = 12;
        const x = (window.innerWidth - w) / 2;
        const y = 50;
        const pct = Math.min(1, this.score / this.config.target);

        // Подложка
        this.ctx.fillStyle = "rgba(0,0,0,0.5)";
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, 6);
        this.ctx.fill();

        // Заполнение (Зеленое)
        this.ctx.fillStyle = "#00e5ff"; // Неоновый голубой
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w * pct, h, 6);
        this.ctx.fill();

        // Текст "5 / 10"
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 14px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.shadowColor = "black";
        this.ctx.shadowBlur = 2;
        this.ctx.fillText(`${this.score} / ${this.config.target}`, window.innerWidth / 2, y + 30);
        this.ctx.shadowBlur = 0;
    }

    win() {
        this.isRunning = false;
        if (this.onWin) this.onWin(this.config.id); // Передаем ID уровня
    }

    lose() {
        this.isRunning = false;
        if (this.onLose) this.onLose(this.score);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }
}
