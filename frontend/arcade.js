/**
 * АРКАДНЫЙ ИГРОВОЙ ДВИЖОК (arcade.js)
 * Адаптирован под Fullscreen Telegram.
 */

export class ArcadeGame {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;

        this.bird = {
            x: 0,
            y: 0,
            width: 38,
            height: 28,
            gravity: 0.5,
            velocity: 0,
            jump: -7
        };

        this.pipes = [];
        this.coins = []; // В аркаде обычно есть монетки для сбора
        this.score = 0;
        this.isRunning = false;
        this.frameCount = 0;

        this.resize();

        // Управление
        window.addEventListener('touchstart', (e) => {
            if (this.isRunning) {
                e.preventDefault();
                this.flap();
            }
        }, { passive: false });
        window.addEventListener('mousedown', () => this.flap());
    }

    /**
     * Подгонка под размер экрана
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.bird.x = this.canvas.width * 0.25;
        if (!this.isRunning) {
            this.bird.y = this.canvas.height / 2;
        }
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
        this.coins = [];
        this.score = 0;
        this.frameCount = 0;
    }

    flap() {
        if (!this.isRunning) return;
        this.bird.velocity = this.bird.jump;
    }

    createObjects() {
        const gap = 180; // Чуть больше проход для аркады
        const minHeight = 60;
        const topHeight = Math.random() * (this.canvas.height - gap - minHeight * 2) + minHeight;

        // Создаем трубу
        const pipeX = this.canvas.width;
        this.pipes.push({
            x: pipeX,
            top: topHeight,
            bottom: this.canvas.height - topHeight - gap,
            width: 60,
            passed: false
        });

        // Создаем монетку в центре прохода
        if (Math.random() > 0.5) {
            this.coins.push({
                x: pipeX + 100, // Чуть дальше трубы
                y: topHeight + gap / 2,
                radius: 10,
                collected: false
            });
        }
    }

    update() {
        if (!this.isRunning) return;
        this.frameCount++;

        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;

        if (this.frameCount % 100 === 0) {
            this.createObjects();
        }

        // Обновление труб
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            let p = this.pipes[i];
            p.x -= 3.5; // Аркада чуть быстрее

            if (p.x + p.width < 0) {
                this.pipes.splice(i, 1);
                continue;
            }

            // Столкновения с трубами
            if (
                this.bird.x + this.bird.width > p.x &&
                this.bird.x < p.x + p.width &&
                (this.bird.y < p.top || this.bird.y + this.bird.height > this.canvas.height - p.bottom)
            ) {
                this.gameOver();
            }

            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
            }
        }

        // Обновление монет
        for (let i = this.coins.length - 1; i >= 0; i--) {
            let c = this.coins[i];
            c.x -= 3.5;

            // Дистанция между птицей и монетой (коллизия круга)
            const dx = (this.bird.x + this.bird.width/2) - c.x;
            const dy = (this.bird.y + this.bird.height/2) - c.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 25 && !c.collected) {
                c.collected = true;
                this.score += 5; // Бонусные очки
                if (window.state) window.state.coins += 1; // Добавляем монету в общий баланс
            }

            if (c.x < -20 || c.collected) this.coins.splice(i, 1);
        }

        if (this.bird.y + this.bird.height > this.canvas.height || this.bird.y < 0) {
            this.gameOver();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Птица (в аркаде можно сделать другого цвета)
        this.ctx.fillStyle = "#e74c3c"; 
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.width, this.bird.height);

        // Трубы
        this.ctx.fillStyle = "#34495e";
        this.pipes.forEach(p => {
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            this.ctx.fillRect(p.x, this.canvas.height - p.bottom, p.width, p.bottom);
        });

        // Монетки
        this.ctx.fillStyle = "#f1c40f";
        this.coins.forEach(c => {
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Счет
        if (this.isRunning) {
            this.ctx.fillStyle = "white";
            this.ctx.font = "bold 30px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(`ARCADE: ${this.score}`, this.canvas.width / 2, 50);
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
        if (this.onGameOver) this.onGameOver(this.score);
    }
}