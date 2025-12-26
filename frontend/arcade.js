import { Game } from './game.js';

export class ArcadeGame extends Game {
    constructor(canvas, onGameOver) {
        super(canvas, onGameOver);
        this.resetArcadeState();
        
        this.arcadeConfig = {
            coinChance: 0.6,
            itemChance: 0.15,
            magnetRadius: 180,
            activeDuration: 400, // Примерно 7-8 секунд
            ghostOpacity: 0.5
        };
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
        // Сбрасываем базовые параметры, чтобы птица появилась
        this.score = 0;
        this.pipes = [];
        this.gap = 150; 
        this.frame = 0;
    }

    // Инициализация перед стартом (важно для фикса "невидимой птицы")
    init() {
        this.resetArcadeState();
        if (this.bird) {
            this.bird.y = this.canvas.height / 2;
            this.bird.velocity = 0;
        }
    }

    start() {
        this.init(); 
        this.isRunning = true;
        this.gameLoop(); // Запускаем цикл отрисовки
    }

    createPipe() {
        super.createPipe(); 
        const lastPipe = this.pipes[this.pipes.length - 1];
        
        // 1. Монеты
        if (Math.random() < this.arcadeConfig.coinChance) {
            this.coins.push({
                x: lastPipe.x + lastPipe.width / 2,
                y: lastPipe.top + (this.gap / 2),
                collected: false,
                angle: 0 // Для анимации вращения
            });
        }

        // 2. Предметы
        if (Math.random() < this.arcadeConfig.itemChance) {
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.items.push({
                x: lastPipe.x + 200, 
                y: Math.random() * (this.canvas.height - 300) + 150,
                type: randomType,
                oscillation: 0 // Плавное движение вверх-вниз
            });
        }
    }

    update() {
        if (!this.isRunning) return;

        // Эффект расширения прохода
        const targetGap = this.activePowerups.gap > 0 ? 260 : 160;
        this.gap += (targetGap - this.gap) * 0.05;

        super.update();
        this.updateArcadeElements();
        this.checkPowerupCollisions();
    }

    updateArcadeElements() {
        // Таймеры бонусов
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) this.activePowerups[key]--;
        });

        // Монеты + Магнит
        this.coins.forEach(coin => {
            coin.x -= this.speed;
            coin.angle += 0.1;

            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y);
                if (dist < this.arcadeConfig.magnetRadius) {
                    coin.x += (this.bird.x - coin.x) * 0.2;
                    coin.y += (this.bird.y - coin.y) * 0.2;
                }
            }
        });

        // Предметы + Плавное покачивание
        this.items.forEach(item => {
            item.x -= this.speed;
            item.oscillation += 0.05;
            item.y += Math.sin(item.oscillation) * 1.5;
        });

        this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
        this.items = this.items.filter(i => i.x > -50);
    }

    checkPowerupCollisions() {
        // Сбор монет (дистанция 35px)
        this.coins.forEach(coin => {
            if (Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y) < 35) {
                coin.collected = true;
                window.state.coins += 1;
                if (window.updateGlobalUI) window.updateGlobalUI();
                // Хэптик при сборе монеты
                window.Telegram?.WebApp.HapticFeedback.impactOccurred('light');
            }
        });

        // Сбор предметов
        this.items.forEach((item, index) => {
            if (Math.hypot(this.bird.x - item.x, this.bird.y - item.y) < 40) {
                this.activatePowerup(item.type);
                this.items.splice(index, 1);
                window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success');
            }
        });

        // Логика бессмертия (GHOST)
        if (this.activePowerups.ghost > 0) {
            if (this.bird.y + this.bird.radius >= this.canvas.height || this.bird.y <= 0) {
                this.gameOver();
            }
        } else {
            // Обычная коллизия или Щит
            if (this.checkCollision()) {
                if (this.activePowerups.shield > 0) {
                    this.activePowerups.shield = 0;
                    // Отбрасываем трубы подальше, чтобы дать игроку окно
                    this.pipes = this.pipes.filter(p => p.x > this.bird.x + 100);
                    window.Telegram?.WebApp.HapticFeedback.notificationOccurred('warning');
                } else {
                    this.gameOver();
                }
            }
        }
    }

    activatePowerup(type) {
        this.activePowerups[type] = this.arcadeConfig.activeDuration;
        console.log(`Arcade: ${type} activated!`);
    }

    draw() {
        const ctx = this.ctx;
        
        if (this.activePowerups.ghost > 0) ctx.globalAlpha = this.arcadeConfig.ghostOpacity;
        super.draw();
        ctx.globalAlpha = 1.0;

        // Рисуем монеты (Красивые, с обводкой)
        this.coins.forEach(coin => {
            ctx.save();
            ctx.translate(coin.x, coin.y);
            ctx.scale(Math.cos(coin.angle), 1); // Эффект вращения
            ctx.fillStyle = "#FFD700";
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#B8860B";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        });

        // Рисуем предметы
        this.items.forEach(item => {
            ctx.font = "30px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            ctx.fillText(icons[item.type] || '🎁', item.x, item.y);
        });

        // Визуальные эффекты активных бонусов
        this.drawPowerupEffects();
    }

    drawPowerupEffects() {
        const ctx = this.ctx;
        if (this.activePowerups.shield > 0) {
            ctx.strokeStyle = "#00fbff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.bird.x, this.bird.y, this.bird.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.activePowerups.magnet > 0) {
            ctx.strokeStyle = "#ff3333";
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.bird.x, this.bird.y, this.bird.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}