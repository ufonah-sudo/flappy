import { Game } from './game.js';

export class ArcadeGame extends Game {
    constructor(canvas, onGameOver) {
        super(canvas, onGameOver);
        
        this.arcadeConfig = {
            coinChance: 0.6,
            itemChance: 0.2,
            magnetRadius: 200,
            activeDuration: 400, // ~7-8 сек
            ghostOpacity: 0.5
        };
        this.resetArcadeState();
    }

    resetArcadeState() {
        this.coins = [];
        this.items = [];
        this.activePowerups = {
            shield: 0,
            magnet: 0,
            ghost: 0,
            gap: 0
        };
        // Синхронизируем gap с базовым классом
        this.gap = window.innerHeight * 0.28; 
    }

    start() {
        this.resetArcadeState();
        // super.start() сам вызовет loop()
        super.start(); 
    }

    // Исправляем метод создания труб, чтобы он работал с логикой Game.js
    spawnPipe() {
        // Рассчитываем динамический зазор (для бонуса ↔️)
        const currentGap = this.activePowerups.gap > 0 ? window.innerHeight * 0.40 : window.innerHeight * 0.28;
        
        const minH = 100;
        const maxH = window.innerHeight - currentGap - minH;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        const newPipe = {
            x: window.innerWidth,
            width: 70, 
            top: h,
            bottom: h + currentGap,
            passed: false
        };

        this.pipes.push(newPipe);

        // 1. Монеты (всегда в центре прохода)
        if (Math.random() < this.arcadeConfig.coinChance) {
            this.coins.push({
                x: newPipe.x + newPipe.width / 2,
                y: newPipe.top + (currentGap / 2),
                collected: false,
                angle: 0
            });
        }

        // 2. Предметы
        if (Math.random() < this.arcadeConfig.itemChance) {
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            this.items.push({
                x: newPipe.x + 300, 
                y: Math.random() * (window.innerHeight - 300) + 150,
                type: types[Math.floor(Math.random() * types.length)],
                oscillation: 0
            });
        }
    }

    update() {
        if (!this.isRunning) return;

        // Вызываем базовое обновление (движение птицы, труб и базовые коллизии)
        super.update();

        // Обновляем таймеры бонусов
        for (let key in this.activePowerups) {
            if (this.activePowerups[key] > 0) this.activePowerups[key]--;
        }

        this.updateArcadeElements();
        this.checkArcadeCollisions();
    }

    updateArcadeElements() {
        // Двигаем монеты и применяем магнит
        this.coins.forEach(coin => {
            coin.x -= this.pipeSpeed; // Используем скорость из Game.js
            coin.angle += 0.1;

            if (this.activePowerups.magnet > 0 && this.bird) {
                const dist = Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y);
                if (dist < this.arcadeConfig.magnetRadius) {
                    coin.x += (this.bird.x - coin.x) * 0.25;
                    coin.y += (this.bird.y - coin.y) * 0.25;
                }
            }
        });

        // Двигаем предметы
        this.items.forEach(item => {
            item.x -= this.pipeSpeed;
            item.oscillation += 0.05;
            item.y += Math.sin(item.oscillation) * 2;
        });

        // Чистим массивы
        this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
        this.items = this.items.filter(i => i.x > -50);
    }

    checkArcadeCollisions() {
        if (!this.bird) return;

        // Сбор монет
        this.coins.forEach(coin => {
            if (Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y) < 40) {
                coin.collected = true;
                if (window.state) {
                    window.state.coins++;
                    if (window.updateGlobalUI) window.updateGlobalUI();
                }
                window.Telegram?.WebApp.HapticFeedback.impactOccurred('light');
            }
        });

        // Сбор бонусов
        this.items.forEach((item, index) => {
            if (Math.hypot(this.bird.x - item.x, this.bird.y - item.y) < 45) {
                this.activePowerups[item.type] = this.arcadeConfig.activeDuration;
                this.items.splice(index, 1);
                window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success');
            }
        });

        // Специальная логика Ghost и Shield теперь встроена в Game.update()
        // Но для Аркады добавим проверку "Призрака" на трубы, так как база этого не знает
        if (this.activePowerups.ghost > 0) {
            // В режиме призрака мы просто "выключаем" коллизии с трубами
            // Но базовый класс уже мог вызвать gameOver. 
            // Чтобы это работало идеально, в Game.js коллизия должна проверять this.activePowerups.ghost
        }
    }

    draw() {
        // Мы НЕ вызываем super.draw() здесь, так как мы хотим контролировать порядок слоев
        // 1. Очистка
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Рисуем трубы (базовый метод)
        this.pipes.forEach(p => {
            this.ctx.fillStyle = '#73bf2e';
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 3;
            this.drawPipeRect(p.x, 0, p.width, p.top, true);
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false);
        });

        // 3. Рисуем монеты
        this.coins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y);
            this.ctx.scale(Math.cos(coin.angle), 1);
            this.ctx.fillStyle = "#FFD700";
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = "gold";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 4. Рисуем предметы
        this.ctx.font = "35px Arial";
        this.ctx.textAlign = "center";
        this.items.forEach(item => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            this.ctx.fillText(icons[item.type] || '🎁', item.x, item.y + 12);
        });

        // 5. Рисуем птицу (с учетом Ghost)
        this.ctx.save();
        if (this.activePowerups.ghost > 0) this.ctx.globalAlpha = 0.5;
        
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        // Щит (если собран в Аркаде)
        if (this.activePowerups.shield > 0 || this.shieldActive) {
            this.ctx.strokeStyle = "#00fbff";
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size * 0.8, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();
    }
}