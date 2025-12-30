export class CareerGame {
    constructor(canvas, onWin, onLose) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onWin = onWin;
        this.onLose = onLose;

        // Состояние уровня
        this.bird = { x: 0, y: 0, size: 35, velocity: 0 };
        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        
        // Настройки текущего уровня
        this.config = { target: 10, speed: 3, gap: 150 };

        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        window.addEventListener('keydown', (e) => e.code === 'Space' && this.handleInput());
        this.canvas.addEventListener('touchstart', this.handleInput);
    }

    // Запуск уровня с параметрами
    initLevel(levelNum) {
        // Прогрессивная формула сложности
        this.config = {
            level: levelNum,
            target: 5 + Math.floor(levelNum * 0.5),      // Цель растет
            speed: 3 + (levelNum * 0.05),                // Скорость растет
            gap: Math.max(100, 180 - (levelNum * 0.8)),  // Проем сужается
            spawnRate: Math.max(70, 100 - (levelNum * 0.3)) // Трубы чаще
        };

        this.reset();
        this.isRunning = true;
        this.loop();
    }

    reset() {
        this.score = 0;
        this.pipes = [];
        this.bird.y = this.canvas.height / 2 / (window.devicePixelRatio || 1);
        this.bird.velocity = 0;
        this.tick = 0;
    }

    handleInput() {
        if (!this.isRunning) return;
        this.bird.velocity = -window.innerHeight * 0.009; // Прыжок
    }

    update() {
        if (!this.isRunning) return;

        // Физика птицы
        this.bird.velocity += 0.4; // Гравитация
        this.bird.y += this.bird.velocity;

        // Генерация труб
        this.tick++;
        if (this.tick > this.config.spawnRate) {
            this.spawnPipe();
            this.tick = 0;
        }

        // Движение и коллизия труб
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.config.speed;

            // Проверка прохождения
            if (!p.passed && p.x < this.bird.x) {
                p.passed = true;
                this.score++;
                if (this.score >= this.config.target) this.completeLevel();
            }

            // Столкновение
            if (this.checkHit(p)) this.gameOver();

            if (p.x < -100) this.pipes.splice(i, 1);
        }

        if (this.bird.y > window.innerHeight || this.bird.y < -50) this.gameOver();
    }

    spawnPipe() {
        const h = Math.random() * (this.canvas.height / 2);
        this.pipes.push({
            x: window.innerWidth,
            top: h,
            bottom: h + this.config.gap,
            passed: false
        });
    }

    checkHit(p) {
        const b = this.bird;
        if (b.x + b.size > p.x && b.x < p.x + 60) {
            if (b.y < p.top || b.y + b.size > p.bottom) return true;
        }
        return false;
    }

    completeLevel() {
        this.isRunning = false;
        this.onWin(this.config.level);
    }

    gameOver() {
        this.isRunning = false;
        this.onLose();
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем трубы (стиль "Карьера" - минимализм)
        ctx.fillStyle = "#4a4a4a";
        this.pipes.forEach(p => {
            ctx.fillRect(p.x, 0, 60, p.top);
            ctx.fillRect(p.x, p.bottom, 60, window.innerHeight);
        });

        // Рисуем птицу
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(this.bird.x, this.bird.y, this.bird.size, this.bird.size);

        // Прогресс-бар вверху
        this.drawProgress();
    }

    drawProgress() {
        const progress = (this.score / this.config.target) * 100;
        this.ctx.fillStyle = "rgba(0,0,0,0.2)";
        this.ctx.fillRect(50, 20, window.innerWidth - 100, 10);
        this.ctx.fillStyle = "#00FF7F";
        this.ctx.fillRect(50, 20, (window.innerWidth - 100) * (progress / 100), 10);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}