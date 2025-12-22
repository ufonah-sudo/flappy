export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        this.bird = { x: 50, y: 0, size: 35, velocity: 0 };
        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        this.reviveUsed = false;
        
        this.gravity = 0;
        this.jump = 0;
        this.pipeSpeed = 3;
        this.pipeSpawnTimer = 0;

        // Привязка клика
        this.canvas.addEventListener('mousedown', () => this.flap());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.flap();
        });

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.bird.x = this.canvas.width / 4;
        if (!this.isRunning) this.bird.y = this.canvas.height / 2;
        
        this.gravity = this.canvas.height * 0.0006;
        this.jump = -this.canvas.height * 0.013;
        this.pipeSpeed = this.canvas.width * 0.008;
    }

    start() {
        this.score = 0;
        this.pipes = [];
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.reviveUsed = false;
        this.isRunning = true;
        this.loop();
    }

    revive() {
        this.reviveUsed = true;
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 100);
        this.isRunning = true;
        this.loop();
    }

    flap() {
        if (this.isRunning) this.bird.velocity = this.jump;
    }

    spawnPipe() {
        const gap = this.canvas.height * 0.28;
        const minPipeHeight = 50;
        const maxPipeHeight = this.canvas.height - gap - minPipeHeight;
        const pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;

        this.pipes.push({
            x: this.canvas.width,
            width: 60,
            top: pipeHeight,
            bottom: pipeHeight + gap,
            passed: false
        });
    }

    update() {
        if (!this.isRunning) return;

        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Спавн труб
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer > 90) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        this.pipes.forEach((pipe, index) => {
            pipe.x -= this.pipeSpeed;

            // Коллизии
            if (
                this.bird.x + this.bird.size > pipe.x &&
                this.bird.x < pipe.x + pipe.width &&
                (this.bird.y < pipe.top || this.bird.y + this.bird.size > pipe.bottom)
            ) {
                this.gameOver();
            }

            // Счет
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }
        });

        // Смерть от границ
        if (this.bird.y + this.bird.size > this.canvas.height || this.bird.y < 0) {
            this.gameOver();
        }

        // Удаление старых труб
        if (this.pipes.length > 0 && this.pipes[0].x < -60) this.pipes.shift();
    }

    draw() {
        this.ctx.fillStyle = "#4ec0ca";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Трубы
        this.ctx.fillStyle = "#73bf2e";
        this.pipes.forEach(pipe => {
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
            this.ctx.fillRect(pipe.x, pipe.bottom, pipe.width, this.canvas.height);
        });

        // Птица (пока желтый квадрат)
        this.ctx.fillStyle = "#f8e71c";
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.size, this.bird.size);
    }

    gameOver() {
        this.isRunning = false;
        this.onGameOver(this.score, this.reviveUsed);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}