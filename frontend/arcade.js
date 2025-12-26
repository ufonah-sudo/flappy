import { Game } from './game.js';

export class ArcadeGame extends Game {
    constructor(canvas, onGameOver) {
        super(canvas, onGameOver);
        this.resetArcadeState();
        
        // Настройки шансов появления
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
        this.items = []; // Предметы, летящие на поле
        this.activePowerups = {
            shield: 0,
            magnet: 0,
            ghost: 0,
            gap: 0
        };
    }

    start() {
        this.resetArcadeState();
        super.start();
    }

    // Перезаписываем создание препятствий, чтобы добавить туда монеты и бонусы
    createPipe() {
        super.createPipe(); // Создаем стандартную трубу
        
        const lastPipe = this.pipes[this.pipes.length - 1];
        
        // 1. Генерируем монету в центре прохода трубы
        if (Math.random() < this.arcadeConfig.coinChance) {
            this.coins.push({
                x: lastPipe.x + lastPipe.width / 2,
                y: lastPipe.top + (this.gap / 2),
                collected: false
            });
        }

        // 2. Генерируем случайный предмет из инвентаря
        if (Math.random() < this.arcadeConfig.itemChance) {
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.items.push({
                x: lastPipe.x + 150, // Чуть дальше трубы
                y: Math.random() * (this.canvas.height - 200) + 100,
                type: randomType
            });
        }
    }

    update() {
        if (!this.isRunning) return;

        // Применяем бонус GAP (расширение прохода) динамически
        const targetGap = this.activePowerups.gap > 0 ? 250 : 150;
        this.gap += (targetGap - this.gap) * 0.1;

        super.update();
        this.updateArcadeElements();
        this.checkPowerupCollisions();
    }

    updateArcadeElements() {
        // Уменьшаем таймеры активных бонусов
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) this.activePowerups[key]--;
        });

        // Двигаем монеты
        this.coins.forEach(coin => {
            coin.x -= this.speed;

            // Логика магнита
            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y);
                if (dist < this.arcadeConfig.magnetRadius) {
                    coin.x += (this.bird.x - coin.x) * 0.15;
                    coin.y += (this.bird.y - coin.y) * 0.15;
                }
            }
        });

        // Двигаем предметы
        this.items.forEach(item => { item.x -= this.speed; });

        // Чистим массивы от того, что улетело за экран
        this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
        this.items = this.items.filter(i => i.x > -50);
    }

    checkPowerupCollisions() {
        // Сбор монет
        this.coins.forEach(coin => {
            if (Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y) < 30) {
                coin.collected = true;
                window.state.coins += 1; // Добавляем в глобальный баланс
                if (window.updateGlobalUI) window.updateGlobalUI();
            }
        });

        // Сбор предметов
        this.items.forEach((item, index) => {
            if (Math.hypot(this.bird.x - item.x, this.bird.y - item.y) < 35) {
                this.activatePowerup(item.type);
                this.items.splice(index, 1);
            }
        });

        // Перезаписываем проверку столкновений для GHOST и SHIELD
        if (this.activePowerups.ghost > 0) {
            // В режиме призрака игнорируем трубы, проверяем только пол/потолок
            if (this.bird.y + this.bird.radius >= this.canvas.height || this.bird.y <= 0) {
                this.gameOver();
            }
        } else {
            // Обычная проверка столкновений
            if (this.checkCollision()) {
                if (this.activePowerups.shield > 0) {
                    this.activePowerups.shield = 0; // Щит ломается
                    this.pipes.shift(); // Убираем ближайшую трубу, чтобы не удариться снова
                } else {
                    this.gameOver();
                }
            }
        }
    }

    activatePowerup(type) {
        this.activePowerups[type] = this.arcadeConfig.activeDuration;
        // Можно добавить звуковой эффект
        console.log(`Powerup collected: ${type}`);
    }

    draw() {
        const ctx = this.ctx;
        
        // 1. Прозрачность для GHOST
        if (this.activePowerups.ghost > 0) ctx.globalAlpha = this.arcadeConfig.ghostOpacity;
        
        super.draw();
        ctx.globalAlpha = 1.0;

        // 2. Рисуем монеты
        this.coins.forEach(coin => {
            ctx.fillStyle = "#f7d51d";
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.stroke();
        });

        // 3. Рисуем предметы (иконки или символы)
        this.items.forEach(item => {
            ctx.fillStyle = "#ff00ff";
            ctx.font = "20px Arial";
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↕️' };
            ctx.fillText(icons[item.type] || '?', item.x, item.y);
        });

        // 4. Эффекты вокруг птицы
        if (this.activePowerups.shield > 0) {
            ctx.strokeStyle = "#00fbff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.bird.x, this.bird.y, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.activePowerups.magnet > 0) {
            ctx.strokeStyle = "#ff3333";
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.bird.x, this.bird.y, 40, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}