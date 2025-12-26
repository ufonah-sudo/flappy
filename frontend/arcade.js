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
        // Вызываем сброс базовой игры через super, если он там есть
        // Инициализируем свои массивы
        this.coins = [];
        this.items = [];
        this.activePowerups = {
            shield: 0,
            magnet: 0,
            ghost: 0,
            gap: 0
        };
        this.gap = 160; // Стандартный проход
    }

    start() {
        this.resetArcadeState();
        // ВАЖНО: убедись, что в базовом классе Game метод start не запускает еще один цикл
        super.start(); 
    }

    // Переопределяем создание труб, чтобы добавлять в них ништяки
    createPipe() {
        super.createPipe(); // Создаем саму трубу
        const lastPipe = this.pipes[this.pipes.length - 1];
        if (!lastPipe) return;

        // 1. Спавн монет в центре прохода
        if (Math.random() < this.arcadeConfig.coinChance) {
            this.coins.push({
                x: lastPipe.x + lastPipe.width / 2,
                y: lastPipe.top + (this.gap / 2),
                collected: false,
                angle: 0
            });
        }

        // 2. Спавн предметов между трубами
        if (Math.random() < this.arcadeConfig.itemChance) {
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            this.items.push({
                x: lastPipe.x + 300, 
                y: Math.random() * (this.canvas.height - 300) + 150,
                type: types[Math.floor(Math.random() * types.length)],
                oscillation: 0
            });
        }
    }

    update() {
        if (!this.isRunning) return;

        // Эффект расширения прохода (плавный)
        const targetGap = this.activePowerups.gap > 0 ? 280 : 160;
        this.gap += (targetGap - this.gap) * 0.05;

        // Вызываем базовое обновление (движение птицы, труб)
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
            coin.x -= this.speed;
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
            item.x -= this.speed;
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
                if (window.state) window.state.coins++;
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

        // Специальная логика смерти для Аркады
        if (this.checkCollision()) {
            if (this.activePowerups.ghost > 0) {
                // Если призрак — умираем только от границ экрана
                if (this.bird.y <= 0 || this.bird.y + this.bird.height >= this.canvas.height) {
                    this.gameOver();
                }
            } else if (this.activePowerups.shield > 0) {
                // Если щит — ломаем его и удаляем ближайшие трубы
                this.activePowerups.shield = 0;
                this.pipes = this.pipes.filter(p => p.x > this.bird.x + 150);
                window.Telegram?.WebApp.HapticFeedback.notificationOccurred('warning');
            } else {
                // Иначе обычная смерть
                this.gameOver();
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        
        // Эффект прозрачности при Ghost
        if (this.activePowerups.ghost > 0) ctx.globalAlpha = 0.5;
        super.draw(); // Рисуем птицу и трубы из Game.js
        ctx.globalAlpha = 1.0;

        // Отрисовка монет
        this.coins.forEach(coin => {
            ctx.save();
            ctx.translate(coin.x, coin.y);
            ctx.scale(Math.cos(coin.angle), 1);
            ctx.fillStyle = "#FFD700";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "gold";
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Отрисовка предметов (Эмодзи)
        ctx.font = "35px Arial";
        this.items.forEach(item => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            ctx.fillText(icons[item.type] || '🎁', item.x - 17, item.y + 12);
        });

        this.drawEffects();
    }

    drawEffects() {
        if (this.activePowerups.shield > 0) {
            this.ctx.strokeStyle = "#00fbff";
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2, 40, 0, Math.PI*2);
            this.ctx.stroke();
        }
    }
}