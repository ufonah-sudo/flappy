export class Game {
    constructor(canvas, onGameOver) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        
        // Настройки птицы
        this.bird = { x: 50, y: 0, size: 40, velocity: 0, rotation: 0 };
        this.pipes = [];
        this.score = 0;
        
        // Состояние
        this.isRunning = false;
        this.isPaused = false;
        this.reviveUsed = false;
        
        // --- ЗАГРУЗКА СПРАЙТОВ ---
        this.birdSprites = [];
        const sources = ['bird1.png', 'bird2.png', 'bird3.png'];
        sources.forEach(src => {
            const img = new Image();
            img.src = `assets/${src}`;
            this.birdSprites.push(img);
        });

        // Анимация спрайта
        this.frameIndex = 0;
        this.tickCount = 0;
        this.ticksPerFrame = 8; // Чуть замедлил анимацию крыльев для плавности

        // Физика (будет пересчитана в resize)
        this.gravity = 0;
        this.jump = 0;
        this.pipeSpeed = 0;
        
        // Таймеры
        this.pipeSpawnTimer = 0;
        this.pipeSpawnThreshold = 100; // Динамический порог
        this.animationId = null;

        // --- УПРАВЛЕНИЕ ---
        this.handleInput = (e) => {
            // Блокируем стандартные действия (скролл и т.д.) только если игра идет
            if (this.isRunning && e.cancelable) e.preventDefault();
            this.flap();
        };

        this.handleKeyDown = (e) => {
            if (e.code === 'Space') {
                this.flap();
            }
        };

        // Привязка событий
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);

        // Адаптивность
        this.handleResize = () => this.resize();
        window.addEventListener('resize', this.handleResize);
        
        // Инициализация размеров
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Стартовая позиция
        this.bird.x = this.canvas.width / 4; 
        if (!this.isRunning) this.bird.y = this.canvas.height / 2;
        
        // Адаптивная физика (настройка под разные экраны)
        this.gravity = this.canvas.height * 0.00065;
        this.jump = -this.canvas.height * 0.0125; // Чуть усилил прыжок
        this.pipeSpeed = this.canvas.width * 0.008; // Скорость зависит от ширины

        // Частота труб: чем шире экран, тем больше расстояние между ними в пикселях, но одинаково по времени
        // Примерно каждые 1600мс при 60fps
        this.pipeSpawnThreshold = Math.floor(100 * (this.canvas.width / 400));
        // Ограничиваем, чтобы не было слишком редко
        if (this.pipeSpawnThreshold > 180) this.pipeSpawnThreshold = 180;
        if (this.pipeSpawnThreshold < 90) this.pipeSpawnThreshold = 90;
    }

    start() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.score = 0;
        this.pipes = [];
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.reviveUsed = false;
        this.isRunning = true;
        this.isPaused = false;
        
        this.playSound('start'); // Пример вызова звука
        this.loop();
    }

    revive() {
        this.reviveUsed = true;
        // Очищаем трубы вокруг птицы (Safety Zone)
        this.pipes = this.pipes.filter(p => p.x > this.bird.x + 300 || p.x < this.bird.x - 150);
        this.bird.velocity = 0;
        this.bird.y = Math.max(0, Math.min(this.bird.y, this.canvas.height - 100)); // Возвращаем в безопасную зону
        this.isRunning = true;
        this.loop();
    }

    flap() {
        if (!this.isRunning) return;
        this.bird.velocity = this.jump;
        this.playSound('flap');
    }

    playSound(type) {
        // Проверяем настройки звука из localStorage
        const soundEnabled = localStorage.getItem('sound') !== 'off';
        if (!soundEnabled) return;

        // Здесь ты можешь подключить реальные звуки
        // const audio = new Audio(`assets/sounds/${type}.mp3`);
        // audio.play().catch(() => {});
    }

    spawnPipe() {
        const gap = this.canvas.height * 0.28; // 28% от высоты экрана — просвет
        const minPipeHeight = 80;
        const maxPipeHeight = this.canvas.height - gap - minPipeHeight;
        
        // Рандомная высота
        const pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;

        this.pipes.push({
            x: this.canvas.width,
            width: 75, // Ширина трубы
            top: pipeHeight,
            bottom: pipeHeight + gap,
            passed: false
        });
    }

    update() {
        if (!this.isRunning) return;

        // 1. Физика птицы
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;

        // Расчет поворота (клюв вниз при падении, вверх при прыжке)
        // Плавный поворот
        const targetRotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.bird.velocity * 0.1)));
        this.bird.rotation += (targetRotation - this.bird.rotation) * 0.5;

        // 2. Анимация крыльев
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // 3. Трубы
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // Хитбокс птицы (сужаем для честности)
            const padding = 8;
            const birdHitbox = {
                top: this.bird.y + padding,
                bottom: this.bird.y + this.bird.size - padding,
                left: this.bird.x + padding,
                right: this.bird.x + this.bird.size - padding
            };

            // Проверка столкновения
            if (
                birdHitbox.right > pipe.x && 
                birdHitbox.left < pipe.x + pipe.width &&
                (birdHitbox.top < pipe.top || birdHitbox.bottom > pipe.bottom)
            ) {
                this.playSound('hit');
                this.gameOver();
                return;
            }

            // Начисление очков
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.playSound('score');
                // Диспатчим событие для UI
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
            }

            // Удаление старых труб
            if (pipe.x < -pipe.width) {
                this.pipes.splice(i, 1);
            }
        }

        // 4. Смерть об пол или потолок
        if (this.bird.y + this.bird.size > this.canvas.height || this.bird.y < -this.bird.size) {
            this.playSound('hit');
            this.gameOver();
        }
    }

    draw() {
        // Очистка
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Трубы
        this.pipes.forEach(pipe => {
            // Тело трубы (Градиент для объема)
            const gradient = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            gradient.addColorStop(0, '#558021'); // Темно-зеленый
            gradient.addColorStop(0.2, '#98e346'); // Светлый блик
            gradient.addColorStop(1, '#558021'); 

            this.ctx.fillStyle = gradient;
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 2;

            // Верх
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
            this.ctx.strokeRect(pipe.x, -2, pipe.width, pipe.top + 2); // -2 чтобы скрыть верхнюю грань
            
            // Низ
            this.ctx.fillRect(pipe.x, pipe.bottom, pipe.width, this.canvas.height - pipe.bottom);
            this.ctx.strokeRect(pipe.x, pipe.bottom, pipe.width, this.canvas.height - pipe.bottom);

            // Шапки труб
            const capHeight = 24;
            const capOverhang = 4;
            
            this.ctx.fillStyle = gradient;
            
            // Верхняя шапка
            this.ctx.fillRect(pipe.x - capOverhang, pipe.top - capHeight, pipe.width + (capOverhang*2), capHeight);
            this.ctx.strokeRect(pipe.x - capOverhang, pipe.top - capHeight, pipe.width + (capOverhang*2), capHeight);
            
            // Нижняя шапка
            this.ctx.fillRect(pipe.x - capOverhang, pipe.bottom, pipe.width + (capOverhang*2), capHeight);
            this.ctx.strokeRect(pipe.x - capOverhang, pipe.bottom, pipe.width + (capOverhang*2), capHeight);
        });

        // Птица
        this.ctx.save();
        const centerX = this.bird.x + this.bird.size / 2;
        const centerY = this.bird.y + this.bird.size / 2;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.bird.rotation);

        const currentImg = this.birdSprites[this.frameIndex];
        
        if (currentImg && currentImg.complete) {
            this.ctx.drawImage(
                currentImg, 
                -this.bird.size / 2, 
                -this.bird.size / 2, 
                this.bird.size, 
                this.bird.size
            );
        } else {
            // Фоллбэк (если картинка не загрузилась)
            this.ctx.fillStyle = '#f7d51d';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        // Вызываем колбек, переданный из main.js
        if (this.onGameOver) this.onGameOver(this.score, this.reviveUsed);
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    destroy() {
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
    }
}