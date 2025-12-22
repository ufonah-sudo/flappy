export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.bird = { x: 50, y: this.height / 2, velocity: 0, gravity: 0.5, jump: -8, size: 20 };
        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        this.reviveUsed = false;
        
        // Loop binding
        this.loop = this.loop.bind(this);
    }

    start() {
        this.reset();
        this.isRunning = true;
        requestAnimationFrame(this.loop);
        
        // Input handling
        this.canvas.addEventListener('pointerdown', () => this.jump());
        window.addEventListener('keydown', (e) => { if(e.code === 'Space') this.jump(); });
    }

    reset() {
        this.bird.y = this.height / 2;
        this.bird.velocity = 0;
        this.pipes = [];
        this.score = 0;
        this.reviveUsed = false;
        this.frameCount = 0;
    }

    revive() {
        // Подкидываем птичку и убираем ближайшие трубы
        this.bird.y = this.height / 2;
        this.bird.velocity = 0;
        this.pipes = [];
        this.reviveUsed = true;
        this.isRunning = true;
        requestAnimationFrame(this.loop);
    }

    jump() {
        if (!this.isRunning) return;
        this.bird.velocity = this.bird.jump;
    }

    loop() {
        if (!this.isRunning) return;

        this.update();
        this.draw();
        
        if (this.isRunning) requestAnimationFrame(this.loop);
    }

    update() {
        this.frameCount++;
        
        // Bird Physics
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;

        // Pipe Logic
        if (this.frameCount % 100 === 0) {
            const gap = 150;
            const pipeY = Math.random() * (this.height - gap - 100) + 50;
            this.pipes.push({ x: this.width, topH: pipeY, bottomY: pipeY + gap, passed: false });
        }

        this.pipes.forEach(pipe => {
            pipe.x -= 3; // Speed

            // Collision
            if (
                this.bird.x + this.bird.size > pipe.x && 
                this.bird.x < pipe.x + 50 && 
                (this.bird.y < pipe.topH || this.bird.y + this.bird.size > pipe.bottomY)
            ) {
                this.endGame();
            }

            // Score
            if (pipe.x + 50 < this.bird.x && !pipe.passed) {
                this.score++;
                pipe.passed = true;
                // Dispatch event for UI update
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }
        });

        // Remove off-screen pipes
        this.pipes = this.pipes.filter(p => p.x > -50);

        // Ground/Ceiling collision
        if (this.bird.y + this.bird.size > this.height || this.bird.y < 0) {
            this.endGame();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw Bird
        this.ctx.fillStyle = 'yellow';
        this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.size, this.bird.size);

        // Draw Pipes
        this.ctx.fillStyle = 'green';
        this.pipes.forEach(p => {
            this.ctx.fillRect(p.x, 0, 50, p.topH); // Top
            this.ctx.fillRect(p.x, p.bottomY, 50, this.height - p.bottomY); // Bottom
        });
    }

    endGame() {
        this.isRunning = false;
        this.onGameOver(this.score, this.reviveUsed);
    }
}