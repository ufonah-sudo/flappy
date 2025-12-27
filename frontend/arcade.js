/* ==========================================================================
   КЛАСС ARCADEGAME - РАСШИРЕННЫЙ РЕЖИМ ИГРЫ
   Наследует базовую логику Game и добавляет монеты, бонусы и способности
   ========================================================================== */

import { Game } from './game.js';

export class ArcadeGame extends Game {
    constructor(canvas, onGameOver) {
        // Вызываем конструктор родителя (Game)
        super(canvas, onGameOver);
        
        // Настройки аркадного режима
        this.arcadeConfig = {
            coinChance: 1.0,         // Всегда спавним монету в трубе
            itemChance: 0.3,         // 30% шанс появления случайного бонуса
            magnetRadius: 200,       // Радиус притяжения монет магнитом
            activeDuration: 400,     // Длительность действия бонуса (в кадрах, ~7 сек при 60fps)
            ghostOpacity: 0.5        // Прозрачность птицы в режиме призрака
        };

        this.itemTimer = 0;
        this.resetArcadeState();
    }

    /**
     * Сброс специфических для аркады параметров
     */
    resetArcadeState() {
        this.coins = [];
        this.items = [];
        // Таймеры активных способностей
        this.activePowerups = {
            shield: 0,
            magnet: 0,
            ghost: 0,
            gap: 0
        };
        // Базовый зазор между трубами для аркады
        this.gap = window.innerHeight * 0.28; 
    }

    /**
     * Старт игры (переопределение)
     */
    start() {
        this.resetArcadeState();
        super.start(); // Запускаем базовый цикл из Game.js
    }

    /**
     * Генерация труб с интеграцией монет
     * Переопределяет метод из Game.js
     */
    spawnPipe() {
        // 1. Рассчитываем размер прохода (увеличиваем, если активен бонус GAP)
        const currentGap = this.activePowerups.gap > 0 
            ? window.innerHeight * 0.45 
            : window.innerHeight * 0.28;

        const minH = 100;
        const maxH = window.innerHeight - currentGap - 100;
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        const newPipe = {
            x: window.innerWidth,
            width: 75, 
            top: h,
            bottom: h + currentGap,
            passed: false
        };

        this.pipes.push(newPipe);

        // 2. Добавляем монету строго по центру прохода трубы
        this.coins.push({
            x: newPipe.x + newPipe.width / 2,
            y: newPipe.top + (currentGap / 2),
            collected: false,
            angle: 0 // Для анимации вращения
        });
    }

    /**
     * Главный цикл обновления данных
     */
    update() {
        // Сообщаем родителю об активных бонусах (для корректной обработки коллизий в game.js)
        super.activePowerups = this.activePowerups;
        
        // Вызываем физику птицы и движение труб из базового класса
        super.update();
        
        if (!this.isRunning || this.isPaused) return;

        // 1. Таймер появления случайных бонусов в небе
        this.itemTimer++;
        if (this.itemTimer > 300) { // Каждые ~5 секунд
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            this.items.push({
                x: window.innerWidth + 50,
                y: Math.random() * (window.innerHeight - 300) + 150,
                type: types[Math.floor(Math.random() * types.length)],
                oscillation: 0 // Для плавного плавания вверх-вниз
            });
            this.itemTimer = 0;
        }

        // 2. Обратный отсчет действия способностей
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) {
                this.activePowerups[key]--;
            }
        });

        // 3. Обновление позиций монет и предметов
        this.updateArcadeElements();
        
        // 4. Проверка сбора (столкновения птицы с бонусами)
        this.checkArcadeCollisions();
    }

    /**
     * Движение и анимация монет/предметов
     */
    updateArcadeElements() {
        // Обработка монет
        this.coins.forEach(coin => {
            coin.x -= this.pipeSpeed; // Двигаются со скоростью труб
            coin.angle += 0.1;        // Вращение

            // Эффект МАГНИТА
            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - coin.x, this.bird.y - coin.y);
                if (dist < this.arcadeConfig.magnetRadius) {
                    // Плавное притяжение к птице
                    coin.x += (this.bird.x - coin.x) * 0.15;
                    coin.y += (this.bird.y - coin.y) * 0.15;
                }
            }
        });

        // Обработка летящих бонусов
        this.items.forEach(item => {
            item.x -= this.pipeSpeed;
            item.oscillation += 0.05;
            item.y += Math.sin(item.oscillation) * 2; // Эффект левитации
        });

        // Удаление объектов, вышедших за экран
        this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
        this.items = this.items.filter(i => i.x > -50);
    }

    /**
     * Проверка сбора игровых объектов
     */
    checkArcadeCollisions() {
        const birdCenterX = this.bird.x + this.bird.size / 2;
        const birdCenterY = this.bird.y + this.bird.size / 2;

        // Сбор монет
        this.coins.forEach(coin => {
            if (!coin.collected && Math.hypot(birdCenterX - coin.x, birdCenterY - coin.y) < 40) {
                coin.collected = true;
                // Начисляем в глобальное состояние (window.state из main.js)
                if (window.state) {
                    window.state.coins++;
                    if (window.updateGlobalUI) window.updateGlobalUI();
                }
                window.Telegram?.WebApp.HapticFeedback.impactOccurred('light');
            }
        });

        // Сбор бонусов
        this.items.forEach((item, index) => {
            if (Math.hypot(birdCenterX - item.x, birdCenterY - item.y) < 45) {
                // Активируем таймер способности
                this.activePowerups[item.type] = this.arcadeConfig.activeDuration;
                // Удаляем предмет с экрана
                this.items.splice(index, 1);
                // Уведомление в Telegram
                window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success');
            }
        });
    }

    /**
     * Отрисовка всех элементов (переопределяет Game.draw)
     */
    draw() {
        // Чистим экран
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Отрисовка труб (вызываем вспомогательный метод родителя)
        this.pipes.forEach(p => {
            this.ctx.fillStyle = '#73bf2e';
            this.ctx.strokeStyle = '#2d4c12';
            this.ctx.lineWidth = 3;
            this.drawPipeRect(p.x, 0, p.width, p.top, true);
            this.drawPipeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom, false);
        });

        // 2. Отрисовка монет
        this.coins.forEach(coin => {
            this.ctx.save();
            this.ctx.translate(coin.x, coin.y);
            // Визуальный эффект вращения через scaleX
            this.ctx.scale(Math.cos(coin.angle), 1);
            
            this.ctx.fillStyle = "#FFD700"; // Gold
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#B8860B";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Символическая буква C в центре монеты
            this.ctx.fillStyle = "#B8860B";
            this.ctx.font = "bold 14px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("C", 0, 5);
            
            this.ctx.restore();
        });

        // 3. Отрисовка летящих предметов (Эмодзи)
        this.ctx.font = "34px Arial";
        this.ctx.textAlign = "center";
        this.items.forEach(item => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            // Добавляем свечение вокруг бонуса
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = "white";
            this.ctx.fillText(icons[item.type] || '🎁', item.x, item.y + 12);
            this.ctx.shadowBlur = 0;
        });

        // 4. Отрисовка птицы
        this.ctx.save();
        
        // Применяем прозрачность Призрака
        if (this.activePowerups.ghost > 0) {
            this.ctx.globalAlpha = this.arcadeConfig.ghostOpacity;
        }
        
        this.ctx.translate(this.bird.x + this.bird.size / 2, this.bird.y + this.bird.size / 2);
        this.ctx.rotate(this.bird.rotation);

        // Отрисовка ЩИТА (если бонус активен)
        if (this.activePowerups.shield > 0 || this.shieldActive) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size * 0.9, 0, Math.PI * 2);
            this.ctx.strokeStyle = "#00fbff";
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            // Пульсирующий эффект щита
            this.ctx.fillStyle = `rgba(0, 251, 255, ${0.1 + Math.sin(Date.now()/200) * 0.05})`;
            this.ctx.fill();
        }

        // Сама птица (спрайты загружены в родителе)
        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size / 2, -this.bird.size / 2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();
    }
}