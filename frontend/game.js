export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        this.setupDimensions();
        
        this.bird = { x: 50, y: 0, velocity: 0, gravity: 0.45, jump: -7, size: 24 };
        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        this.reviveUsed = false;
        
        this.loop = this.loop.bind(this);

        // Устанавливаем слушатели ОДИН раз здесь
        this.canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.jump();
        });
        window.addEventListener('keydown', (e) => { 
            if(e.code === 'Space') this.jump(); 
        });
        window.addEventListener('resize', () => this.setupDimensions());
    }

    setupDimensions() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    start() {
        if (this.isRunning) return;
        this.reset();
        this.isRunning = true;
        requestAnimationFrame(this.loop);
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
        this.bird.y = this.height / 2;
        this.bird.velocity = this.bird.jump; // Сразу подбрасываем при оживлении
        this.pipes = [];
        this.isRunning = true;
        this.reviveUsed = true;
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
        requestAnimationFrame(this.loop);
    }

    update() {
        this.frameCount++;
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;

        // Спавн труб
        if (this.frameCount % 90 === 0) {
            const gap = 170; // Немного увеличил зазор для играбельности
            const minPipeHeight = 50;
            const pipeY = Math.random() * (this.height - gap - minPipeHeight * 2) + minPipeHeight;
            this.pipes.push({ x: this.width, topH: pipeY, bottomY: pipeY + gap, passed: false });
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            let p = this.pipes[i];
            p.x -= 3.5; // Чуть увеличил скорость

            // Collision (с небольшим запасом - hitbox меньше визуала на 4px)
            const birdHitbox = {
                left: this.bird.x + 4,
                right: this.bird.x + this.bird.size - 4,
                top: this.bird.y + 4,
                bottom: this.bird.y + this.bird.size - 4
            };

            if (birdHitbox.right > p.x && birdHitbox.left < p.x + 52) {
                if (birdHitbox.top < p.topH || birdHitbox.bottom > p.bottomY) {
                    this.endGame();
                }
            }

            // Score
            if (p.x + 52 < this.bird.x && !p.passed) {
                this.score++;
                p.passed = true;
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }

            if (p.x < -60) this.pipes.splice(i, 1);
        }

        if (this.bird.y + this.bird.size > this.height || this.bird.y < -50) {
            this.endGame();
        }
    }

    draw() {
        // Очистка
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Трубы
        this.pipes.forEach(p => {
            // Градиент для труб
            let grad = this.ctx.createLinearGradient(p.x, 0, p.x + 50, 0);
            grad.addColorStop(0, '#2ecc71');
            grad.addColorStop(1, '#27ae60');
            this.ctx.fillStyle = grad;
            
            this.ctx.fillRect(p.x, 0, 52, p.topH);
            this.ctx.fillRect(p.x, p.bottomY, 52, this.height - p.bottomY);
            
            // Окантовка труб
            this.ctx.strokeStyle = '#1b5e20';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(p.x, 0, 52, p.topH);
            this.ctx.strokeRect(p.x, p.bottomY, 52, this.height - p.bottomY);
        });

        // Птичка (Желтый колобок)
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.beginPath();
        this.ctx.roundRect(this.bird.x, this.bird.y, this.bird.size, this.bird.size, 6);
        this.ctx.fill();
        
        // Глазик
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.bird.x + 14, this.bird.y + 5, 4, 4);
    }

    endGame() {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.onGameOver(this.score, this.reviveUsed);
    }
}