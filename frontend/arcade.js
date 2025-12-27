import { Game } from './game.js';

export class ArcadeGame extends Game {
    constructor(canvas, onGameOver) {
        super(canvas, onGameOver);
        
        this.arcadeConfig = {
            coinChance: 1.0,        // 100% шанс монеты в трубе
            itemChance: 0.3,        // Шанс бонуса
            magnetRadius: 200,
            activeDuration: 400,    // ~7-8 сек
            ghostOpacity: 0.5
        };
        this.itemTimer = 0;
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
        this.gap = window.innerHeight * 0.28; 
    }

    start() {
        this.resetArcadeState();
        super.start(); 
    }

    // ИСПРАВЛЕНО: Чистый метод спавна труб без каши внутри
    spawnPipe() {
        // Увеличиваем проход, если активен бонус GAP
        const currentGap = this.activePowerups.gap > 0 ? window.innerHeight * 0.45 : window.innerHeight * 0.28;
        const h = Math.floor(Math.random() * (window.innerHeight - currentGap - 200)) + 100;

        const newPipe = {
            x: window.innerWidth,
            width: 70, 
            top: h,
            bottom: h + currentGap,
            passed: false
        };

        this.pipes.push(newPipe);

        // Всегда ставим монету в центре прохода трубы
        this.coins.push({
            x: newPipe.x + newPipe.width / 2,
            y: newPipe.top + (currentGap / 2),
            collected: false,
            angle: 0
        });
    }

    update() {
        // 1. Сначала вызываем базовое обновление (физика птицы, движение труб)
        super.update();
        
        if (!this.isRunning || this.isPaused) return;

        // 2. Логика спавна предметов (вне труб по таймеру)
        this.itemTimer++;
        if (this.itemTimer > 250) { // Примерно каждые 4-5 секунд
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            this.items.push({
                x: window.innerWidth + 50,
                y: Math.random() * (window.innerHeight - 300) + 150,
                type: types[Math.floor(Math.random() * types.length)],
                oscillation: 0
            });
            this.itemTimer = 0;
        }

        // 3. Уменьшаем таймеры активных способностей
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) {
                this.activePowerups[key]--;
            }
        });

        // 4. Обновляем монеты и предметы
        this.updateArcadeElements();
        
        // 5. Проверяем сборы
        this.checkArcadeCollisions();

        // 6. ХАК для GHOST мода: если призрак активен, птица не умирает
        // Мы "воскрешаем" её каждый кадр, если она столкнулась
        if (this.activePowerups.ghost > 0) {
            this.isRunning = true; // Отменяем gameOver от труб
        }
    }

    updateArcadeElements() {
        // Монеты + Магнит
        this.coins.forEach(coin => {
            coin.x -= this.pipeSpeed;
            coin.angle += 0.1;

            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y);
                if (dist < this.arcadeConfig.magnetRadius) {
                    coin.x += (this.bird.x - coin.x) * 0.2;
                    coin.y += (this.bird.y - coin.y) * 0.2;
                }
            }
        });

        // Предметы (плавное движение вверх-вниз)
        this.items.forEach(item => {
            item.x -= this.pipeSpeed;
            item.oscillation += 0.05;
            item.y += Math.sin(item.oscillation) * 2;
        });

        // Чистка (оптимизация)
        this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
        this.items = this.items.filter(i => i.x > -50);
    }

    checkArcadeCollisions() {
        const birdCenterX = this.bird.x + this.bird.size / 2;
        const birdCenterY = this.bird.y + this.bird.size / 2;

        // Сбор монет
        this.coins.forEach(coin => {
            if (!coin.collected && Math.hypot(birdCenterX - coin.x, birdCenterY - coin.y) < 40) {
                coin.collected = true;
                if (window.state) {
                    window.state.coins++;
                    if (window.updateGlobalUI) window.updateGlobalUI();
                }
                window.Telegram?.WebApp.HapticFeedback.impactOccurred('light');
            }
        });

        // Сбор предметов
        this.items.forEach((item, index) => {
            if (Math.hypot(birdCenterX - item.x, birdCenterY - item.y) < 45) {
                this.activePowerups[item.type] = this.arcadeConfig.activeDuration;
                this.items.splice(index, 1);
                window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success');
            }
        });
    }

    draw() {
        // Мы переопределяем draw полностью для контроля слоев
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Трубы
        this.pipes.forEach(p => {
            this.ctx.fillStyle = '#73bf2e';
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 3;
            this.drawPipeRect(p.x, 0, p.width, p.top, true);
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false);
        });

        // 2. Монеты
        this.coins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y);
            this.ctx.scale(Math.cos(coin.angle), 1);
            this.ctx.fillStyle = "#FFD700";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#B8860B";
            this.ctx.stroke();
            this.ctx.restore();
        });

        // 3. Предметы (Эмодзи)
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.items.forEach(item => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            this.ctx.fillText(icons[item.type] || '🎁', item.x, item.y + 10);
        });

        // 4. Птица
        this.ctx.save();
        
        // Эффект призрака (прозрачность)
        if (this.activePowerups.ghost > 0) {
            this.ctx.globalAlpha = 0.5;
        }
        
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        // Рисуем щит (если активен бонус ИЛИ предмет из инвентаря)
        if (this.activePowerups.shield > 0 || this.shieldActive) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size * 0.8, 0, Math.PI * 2);
            this.ctx.strokeStyle = "#00fbff";
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();
    }
}