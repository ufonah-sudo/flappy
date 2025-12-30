/**
 * ИГРОВОЙ ДВИЖОК (game.js)
 * Полностью адаптивный под любой размер экрана.
 */

export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;

        // Настройки птицы (в процентах от экрана для адаптивности)
        this.bird = {
            x: 50,
            y: 0,
            width: 34,
            height: 24,
            gravity: 0.6,
            velocity: 0,
            jump: -8
        };

        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        this.reviveUsed = false;
        this.frameCount = 0;

        // Инициализация размеров
        this.resize();
        
        // Слушатель кликов
        window.addEventListener('mousedown', () => this.flap());
        window.addEventListener('touchstart', (e) => {
            if (this.isRunning) {
                e.preventDefault();
                this.flap();
            }
        }, { passive: false });
    }

    /**
     * ГЛАВНЫЙ МЕТОД: Подгонка под размер окна
     */
    resize() {
        // Устанавливаем внутреннее разрешение канваса равным физическому размеру окна
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Корректируем позицию птицы при изменении экрана
        this.bird.x = this.canvas.width * 0.25;
        if (!this.isRunning) {
            this.bird.y = this.canvas.height / 2;
        }

        console.log(`Canvas resized: ${this.canvas.width}x${this.canvas.height}`);
    }

    start() {
        this.reset();
        this.isRunning = true;
        this.loop();
    }

    reset() {
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.pipes = [];
        this.score = 0;
        this.reviveUsed = false;
        this.frameCount = 0;
    }

    flap() {
        if (!this.isRunning) return;
        this.bird.velocity = this.bird.jump;
        // Звук или вибрация может быть здесь
    }

    createPipe() {
        const gap = 160; // Проход между трубами
        const minPipeHeight = 50;
        const maxPipeHeight = this.canvas.height - gap - minPipeHeight;
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;

        this.pipes.push({
            x: this.canvas.width,
            top: topHeight,
            bottom: this.canvas.height - topHeight - gap,
            width: 52,
            passed: false
        });
    }

    update() {
        if (!this.isRunning) return;

        this.frameCount++;
        
        // Птица
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;

        // Генерация труб (каждые 90 кадров)
        if (this.frameCount % 90 === 0) {
            this.createPipe();
        }

        // Логика труб
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            let p = this.pipes[i];
            p.x -= 3; // Скорость движения

            // Удаление труб за экраном
            if (p.x + p.width < 0) {
                this.pipes.splice(i, 1);
                continue;
            }

            // Коллизии (столкновения)
            if (
                this.bird.x + this.bird.width > p.x &&
                this.bird.x < p.x + p.width &&
                (this.bird.y < p.top || this.bird.y + this.bird.height > this.canvas.height - p.bottom)
            ) {
                this.gameOver();
            }

            // Начисление очков
            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
            }
        }

        // Падение на землю или вылет в космос
        if (this.bird.y + this.bird.height > this.canvas.height || this.bird.y < 0) {
            this.gameOver();
        }
    }

    draw() {
        // Очистка экрана (прозрачно, так как фон в CSS)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем птицу
        this.ctx.fillStyle = "#f7d51d";
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.width, this.bird.height);

        // Рисуем трубы
        this.ctx.fillStyle = "#2ecc71";
        this.pipes.forEach(p => {
            // Верхняя труба
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            // Нижняя труба
            this.ctx.fillRect(p.x, this.canvas.height - p.bottom, p.width, p.bottom);
        });

        // Рисуем счет (внутри канваса для надежности)
        if (this.isRunning) {
            this.ctx.fillStyle = "white";
            this.ctx.font = "bold 32px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(this.score, this.canvas.width / 2, 80);
        }
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    gameOver() {
        this.isRunning = false;
        if (this.onGameOver) this.onGameOver(this.score, this.reviveUsed);
    }

    revive() {
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.pipes = []; // Очищаем трубы вокруг птицы
        this.reviveUsed = true;
        this.isRunning = true;
        this.loop();
    }
}