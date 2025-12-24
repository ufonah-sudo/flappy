export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        // Размер птицы чуть увеличим для лучшей видимости графики
        this.bird = { x: 50, y: 0, size: 40, velocity: 0 };
        this.pipes = [];
        this.score = 0;
        this.isRunning = false;
        this.reviveUsed = false;
        
        // --- ЗАГРУЗКА СПРАЙТОВ ПТИЦЫ ---
        this.birdSprites = [];
        // Исправил bird12 на bird2
        const sources = ['bird1.png', 'bird2.png', 'bird3.png'];
        sources.forEach(src => {
            const img = new Image();
            img.src = `assets/${src}`;
            this.birdSprites.push(img);
        });
        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 6; 

        this.gravity = 0;
        this.jump = 0;
        this.pipeSpeed = 3;
        this.pipeSpawnTimer = 0;
        this.animationId = null;

        this.handleInput = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.flap();
        };

        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });

        this.resize();
        this.handleResize = () => this.resize();
        window.addEventListener('resize', this.handleResize);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.bird.x = this.canvas.width / 4;
        if (!this.isRunning) this.bird.y = this.canvas.height / 2;
        
        // Адаптивная физика под высоту экрана
        this.gravity = this.canvas.height * 0.00065;
        this.jump = -this.canvas.height * 0.012;
        this.pipeSpeed = this.canvas.width * 0.007;
    }

    start() {
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
        // Очищаем трубы вокруг птицы при возрождении
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 250 || p.x < this.bird.x - 100);
        this.bird.velocity = 0;
        this.isRunning = true;
        this.loop();
    }

    flap() {
        if (this.isRunning) this.bird.velocity = this.jump;
    }

    spawnPipe() {
        // Расстояние между трубами зависит от высоты экрана
        const gap = this.canvas.height * 0.28; 
        const minPipeHeight = 80;
        const maxPipeHeight = this.canvas.height - gap - minPipeHeight;
        const pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;

        this.pipes.push({
            x: this.canvas.width,
            width: 70, // Чуть шире для баланса
            top: pipeHeight,
            bottom: pipeHeight + gap,
            passed: false
        });
    }

    update() {
        if (!this.isRunning) return;

        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Анимация махов крыльями
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // Спавн труб
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer > 100) { // Чуть реже спавн для комфортной игры
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // Хитбокс птицы (чуть меньше визуального размера для честности)
            const birdHitbox = {
                top: this.bird.y + 10,
                bottom: this.bird.y + this.bird.size - 10,
                left: this.bird.x + 10,
                right: this.bird.x + this.bird.size - 10
            };

            // Проверка столкновений
            if (
                birdHitbox.right > pipe.x && 
                birdHitbox.left < pipe.x + pipe.width &&
                (birdHitbox.top < pipe.top || birdHitbox.bottom > pipe.bottom)
            ) {
                this.gameOver();
                return;
            }

            // Начисление очков
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }

            // Удаление труб за экраном
            if (pipe.x < -pipe.width) {
                this.pipes.splice(i, 1);
            }
        }

        // Смерть от падения или вылета за верх
        if (this.bird.y + this.bird.size > this.canvas.height || this.bird.y < -50) {
            this.gameOver();
        }
    }

    draw() {
        // Очистка холста (прозрачно, так как фон в CSS)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем трубы
        this.pipes.forEach(pipe => {
            this.ctx.fillStyle = "#73bf2e"; // Основной зеленый
            this.ctx.strokeStyle = "#2d4c12"; // Темная обводка
            this.ctx.lineWidth = 3;

            // Верхняя труба
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
            this.ctx.strokeRect(pipe.x, 0, pipe.width, pipe.top);
            
            // Нижняя труба
            this.ctx.fillRect(pipe.x, pipe.bottom, pipe.width, this.canvas.height - pipe.bottom);
            this.ctx.strokeRect(pipe.x, pipe.bottom, pipe.width, this.canvas.height - pipe.bottom);

            // "Шапки" труб (для красоты)
            this.ctx.fillStyle = "#8ed04b";
            this.ctx.fillRect(pipe.x - 5, pipe.top - 20, pipe.width + 10, 20);
            this.ctx.strokeRect(pipe.x - 5, pipe.top - 20, pipe.width + 10, 20);
            
            this.ctx.fillRect(pipe.x - 5, pipe.bottom, pipe.width + 10, 20);
            this.ctx.strokeRect(pipe.x - 5, pipe.bottom, pipe.width + 10, 20);
        });

        // Птица
        this.ctx.save();
        const centerX = this.bird.x + this.bird.size / 2;
        const centerY = this.bird.y + this.bird.size / 2;
        this.ctx.translate(centerX, centerY);
        
        // Поворот птицы
        const rotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 6, this.bird.velocity * 0.04));
        this.ctx.rotate(rotation);

        const currentImg = this.birdSprites[this.frameIndex];
        if (currentImg && currentImg.complete) {
            this.ctx.drawImage(
                currentImg, 
                -this.bird.size / 2, 
                -this.bird.size / 2, 
                this.bird.size, 
                this.bird.size
            );
        }
        
        this.ctx.restore();
    }

    gameOver() {
        if (!this.isRunning) return;
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

    destroy() {
        window.removeEventListener('resize', this.handleResize);
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
}