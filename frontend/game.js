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
        this.animationId = null; // Для контроля цикла

        // Привязка управления
        this.handleInput = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.flap();
        };

        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });

        this.resize();
        // Используем стрелочную функцию, чтобы сохранить контекст
        this.handleResize = () => this.resize();
        window.addEventListener('resize', this.handleResize);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.bird.x = this.canvas.width / 4;
        if (!this.isRunning) this.bird.y = this.canvas.height / 2;
        
        // Адаптивная физика под высоту экрана
        this.gravity = this.canvas.height * 0.0006;
        this.jump = -this.canvas.height * 0.013;
        this.pipeSpeed = this.canvas.width * 0.008;
    }

    start() {
        // Очищаем старый цикл, если он был
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
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
        // Убираем трубы непосредственно перед птицей, чтобы дать игроку окно
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 200 || p.x < this.bird.x - 100);
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

        // Тайминг труб (примерно каждые 1.5 - 2 сек)
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer > 90) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // Коллизии
            if (
                this.bird.x + this.bird.size > pipe.x &&
                this.bird.x < pipe.x + pipe.width &&
                (this.bird.y < pipe.top || this.bird.y + this.bird.size > pipe.bottom)
            ) {
                this.gameOver();
                return; // Выходим из цикла сразу
            }

            // Счет
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }

            // Удаление лишних труб
            if (pipe.x < -pipe.width) {
                this.pipes.splice(i, 1);
            }
        }

        // Смерть от границ
        if (this.bird.y + this.bird.size > this.canvas.height || this.bird.y < 0) {
            this.gameOver();
        }
    }

    draw() {
        // Очистка
        this.ctx.fillStyle = "#4ec0ca";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем трубы
        this.ctx.fillStyle = "#73bf2e";
        this.pipes.forEach(pipe => {
            // Верхняя
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
            // Нижняя
            this.ctx.fillRect(pipe.x, pipe.bottom, pipe.width, this.canvas.height - pipe.bottom);
        });

        // Птица
        this.ctx.fillStyle = "#f8e71c";
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.size, this.bird.size);
    }

    gameOver() {
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.onGameOver(this.score, this.reviveUsed);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    // Метод для очистки ресурсов (если будем удалять объект игры)
    destroy() {
        window.removeEventListener('resize', this.handleResize);
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
}