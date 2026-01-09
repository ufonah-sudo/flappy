/**
 * arcade.js - АРКАДНЫЙ РЕЖИМ ИГРЫ (FINAL)
 * Включает: Способности, Монеты, Физику, Анимации.
 */

// Экспортируем класс, чтобы его можно было импортировать в main.js
export class ArcadeGame {

    // --- КОНСТРУКТОР: ИНИЦИАЛИЗАЦИЯ ---
    constructor(canvas, onGameOver) {
        // Сохраняем ссылку на холст (canvas)
        this.canvas = canvas;
        // Получаем контекст рисования (2D)
        this.ctx = canvas.getContext('2d');
        // Сохраняем функцию, которую вызовем при проигрыше
        this.onGameOver = onGameOver;

        // Настройки земли (бегущая полоска внизу)
        this.ground = {
            img: new Image(), // Создаем объект картинки
            offsetX: 0,       // Смещение по X (для анимации)
            h: 100,           // Высота земли
            realWidth: 512,   // Реальная ширина картинки
            realHeight: 162   // Реальная высота картинки
        };
        // Указываем путь к картинке земли
        this.ground.img.src = '/frontend/assets/ground.png';

        // Настройки Птицы
        this.bird = { 
            x: 50,       // Позиция по X (фиксирована, двигаются трубы)
            y: 0,        // Позиция по Y (меняется)
            size: 45,    // Размер птицы (УВЕЛИЧЕН, как в классике)
            velocity: 0, // Текущая скорость падения/взлета
            rotation: 0  // Угол наклона
        }; 

        // Инициализация массивов игровых объектов
        this.pipes = [];  // Массив труб
        this.coins = [];  // Массив монеток
        this.items = [];  // Массив бонусов (щит, магнит...)
        
        // Переменные состояния игры
        this.score = 0;          // Текущий счет
        this.isRunning = false;  // Запущена ли игра
        this.isPaused = false;   // На паузе ли
        this.reviveUsed = false; // Использовали ли уже "Второе дыхание"
        this.isGhost = false;    // Флаг неуязвимости (после удара или возрождения)

        // Таймеры активных способностей (в кадрах)
        this.activePowerups = { 
            shield: 0, // Щит
            magnet: 0, // Магнит
            ghost: 0,  // Призрак
            gap: 0     // Широкие трубы
        };
        
        // Глобальные настройки баланса
        this.config = {
            itemChance: 0.3,      // Шанс выпадения предмета (примерный)
            magnetRadius: 250,    // Радиус действия магнита
            powerupDuration: 420  // Длительность способностей (60 FPS * 7 сек)
        };

        // Загрузка спрайтов (кадров анимации) птицы
        this.birdSprites = [];
        ['bird1.png', 'bird2.png', 'bird3.png'].forEach(src => {
            const img = new Image();
            img.src = `/frontend/assets/${src}`;
            this.birdSprites.push(img);
        });

        // Переменные для анимации крыльев
        this.frameIndex = 0; // Текущий кадр (0-2)
        this.tickCount = 0;  // Счетчик кадров игры
        this.ticksPerFrame = 6; // Скорость махания крыльями
           this.pipeSpawnTimer = 0; // <--- ДОБАВИТЬ ВОТ ЭТО
        this.itemTimer = 0;  // Таймер спавна бонусов

        // Привязываем контекст `this` к методам, чтобы они не теряли доступ к классу
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleResize = this.resize.bind(this);

        // Запускаем слушатели событий (нажатия)
        this.initEvents();
        // Подгоняем размер холста под экран
        this.resize();
    }

    // --- МЕТОД: АКТИВАЦИЯ СПОСОБНОСТИ ---
    activatePowerupEffect(id) {
        console.log(`🚀 Powerup Activated: ${id}`);
        // В зависимости от ID предмета, ставим таймер эффекта
        switch(id) {
            case 'shield': this.activePowerups.shield = 600; break; // Щит на 10 сек
            case 'gap':    this.activePowerups.gap = 700; break;    // Широкие трубы подольше
            case 'ghost':  this.activePowerups.ghost = 400; break;  // Призрак
            case 'magnet': this.activePowerups.magnet = 700; break; // Магнит
        }
    }

    // --- МЕТОД: СЛУШАТЕЛИ СОБЫТИЙ ---
    initEvents() {
        // Касание пальцем (Touch)
        this.canvas.addEventListener('touchstart', (e) => {
            // Если нажали на кнопку интерфейса поверх канваса — игнорируем прыжок
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault(); // Запрещаем скролл браузера
            this.handleInput(); // Прыгаем
        }, { passive: false });
        
        // Клик мышкой (Desktop)
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            this.handleInput(); // Прыгаем
        });
        
        // Изменение размера окна (поворот телефона)
        window.addEventListener('resize', this.handleResize);
    }

    // --- МЕТОД: РЕСАЙЗ (АДАПТИВНОСТЬ) ---
    resize() {
        // Получаем плотность пикселей экрана (Retina и т.д.)
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Устанавливаем физический размер канваса с учетом DPR
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        
        // Масштабируем контекст, чтобы рисовать в логических пикселях
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Устанавливаем CSS размеры
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        // Проверка: это ПК или телефон? (по высоте)
        const isDesktop = h > 800;
        
        // Ставим птицу на позицию
        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;

        // === НАСТРОЙКИ ФИЗИКИ (КАК В GAME.JS) ===
        // Гравитация
        this.gravity = isDesktop ? 0.45 : h * 0.0006;
        // Сила прыжка (отрицательная, т.к. Y растет вниз)
        this.jump = isDesktop ? -9 : -h * 0.013; 
        
        // Скорость движения труб
        this.pipeSpeed = isDesktop ? 4 : w * 0.008; 
        // Частота появления труб (зависит от ширины)
        this.pipeSpawnThreshold = Math.max(80, Math.floor(100 * (w / 375)));
    }

    // --- МЕТОД: СТАРТ НОВОЙ ИГРЫ ---
    start() {
        // Останавливаем старую анимацию, если была
        if (this.animationId) cancelAnimationFrame(this.animationId);
        
        // Сбрасываем все параметры в ноль
        this.score = 0;
        this.pipes = []; // Удаляем трубы
        this.coins = []; // Удаляем монеты
        this.items = []; // Удаляем бонусы
        
        // Сбрасываем эффекты
        this.activePowerups = { shield: 0, magnet: 0, ghost: 0, gap: 0 };
        this.reviveUsed = false;
        this.isGhost = false;
        
        // Сбрасываем птицу в центр
        this.bird.y = window.innerHeight / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipeSpawnTimer = 0; // <--- ДОБАВИТЬ ВОТ ЭТО
        // Запускаем флаг
        this.isRunning = true;
        
        // Запускаем игровой цикл
        this.loop();
    }

    // --- МЕТОД: ВОЗРОЖДЕНИЕ (REVIVE) ---
    revive() {
        this.isRunning = true;
        this.reviveUsed = true; // Помечаем, что сердце потрачено
        
        // Подбрасываем птицу вверх
        this.bird.velocity = -4; 
        
        // Удаляем трубы, которые слишком близко к птице (чтобы не убить сразу)
        this.pipes = this.pipes.filter(p => p.x < this.bird.x - 100 || p.x > this.bird.x + 300);
        
        // Включаем режим призрака (неуязвимость)
        this.isGhost = true;
        
        // Через 2 секунды выключаем неуязвимость
        setTimeout(() => { this.isGhost = false; }, 2000);
        
        // Возвращаем цикл
        this.loop();
    }

    // --- МЕТОД: СОЗДАНИЕ ТРУБЫ И МОНЕТ ---
    spawnPipe() {
          if (this.pipes.length > 0) {
            const lastPipe = this.pipes[this.pipes.length - 1];
            if (window.innerWidth - lastPipe.x < 220) return; // Минимум 220px между трубами
        }

        const gapBase = window.innerHeight * 0.22; // Чуть больше проем (было 0.18)
        const gapLarge = window.innerHeight * 0.35; // Если активен бонус GAP, проем больше
        
        // Выбираем текущий размер проема
        const currentGap = this.activePowerups.gap > 0 ? gapLarge : gapBase;
        
        // Рассчитываем границы для рандома высоты
        const minH = window.innerHeight / 5;
        const maxH = window.innerHeight - currentGap - 100;
        
        // Случайная высота верхней трубы
        const h = Math.floor(Math.random() * (maxH - minH)) + minH;

        // Создаем объект трубы
        const p = { 
            x: window.innerWidth, // Появляется справа за экраном
            width: 75,            // Ширина трубы
            top: h,               // Высота верхней части
            bottom: h + currentGap, // Начало нижней части
            passed: false         // Прошел ли игрок эту трубу
        };
        // Добавляем в массив
        this.pipes.push(p);

        // С вероятностью 30% создаем монету внутри трубы
        if (Math.random() > 0.3) {
            this.coins.push({
                x: p.x + 37,          // По центру трубы
                y: h + (currentGap / 2), // По центру проема
                angle: 0              // Угол вращения
            });
        }
    }

    // --- МЕТОД: ОБНОВЛЕНИЕ СОСТОЯНИЯ (UPDATE) ---
        update() {
        if (!this.isRunning || this.isPaused) return;

        // 1. Физика птицы
        this.bird.velocity += this.gravity;
        this.bird.y += this.bird.velocity;
        const targetRot = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, (this.bird.velocity * 0.2)));
        this.bird.rotation += (targetRot - this.bird.rotation) * 0.15;

        // 2. Анимация крыльев
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
            this.tickCount = 0;
            this.frameIndex = (this.frameIndex + 1) % this.birdSprites.length;
        }

        // 3. Спавн труб
        this.pipeSpawnTimer = (this.pipeSpawnTimer || 0) + 1;
        if (this.pipeSpawnTimer > this.pipeSpawnThreshold) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // 4. Таймеры способностей
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) this.activePowerups[key]--;
        });

        // 5. Спавн бонусов
        this.itemTimer = (this.itemTimer || 0) + 1;
        if (this.itemTimer > 300) {
            const types = ['shield', 'magnet', 'ghost', 'gap'];
            this.items.push({
                x: window.innerWidth + 50,
                y: Math.random() * (window.innerHeight - 300) + 100,
                type: types[Math.floor(Math.random() * types.length)],
                osc: 0
            });
            this.itemTimer = 0;
        }
        
        // 6. Спавн монет в небе
        if (this.pipeSpawnTimer === 50 && Math.random() > 0.5) {
            const minSpawnY = window.innerHeight / 5;
            const maxSpawnY = window.innerHeight - this.ground.h - 50;
            const startY = Math.random() * (maxSpawnY - minSpawnY) + minSpawnY;
            for (let i = 0; i < 5; i++) {
                this.coins.push({
                    x: window.innerWidth + 50 + (i * 30),
                    y: startY + (Math.sin(i) * 20),
                    collected: false,
                    angle: 0
                });
            }
        }

        // 7. Движение земли
        this.ground.offsetX -= this.pipeSpeed;
        if (this.ground.offsetX <= -this.ground.realWidth) this.ground.offsetX = 0;

        // 8. Смерть об пол
        const groundTop = window.innerHeight - this.ground.h;
        if (this.bird.y + this.bird.size > groundTop) {
            this.bird.y = groundTop - this.bird.size;
            this.gameOver();
            return;
        }

        // 9. Движение и коллизии
        const speed = this.pipeSpeed;
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= speed;
            const pad = 10;
            const hitX = this.bird.x + this.bird.size - pad > p.x && this.bird.x + pad < p.x + p.width;
            const hitY = this.bird.y + pad < p.top || this.bird.y + this.bird.size - pad > p.bottom;

            if (hitX && hitY) {
                if (this.activePowerups.ghost > 0 || this.isGhost) continue;
                if (this.activePowerups.shield > 0) {
                    this.activePowerups.shield = 0;
                    this.pipes.splice(i, 1);
                    if(window.updateGlobalUI) window.updateGlobalUI();
                    continue;
                } else {
                    this.gameOver();
                    return;
                }
            }
            if (!p.passed && p.x + p.width < this.bird.x) {
                p.passed = true;
                this.score++;
                const scoreEl = document.getElementById('score-overlay');
                if(scoreEl) scoreEl.innerText = this.score;
            }
            if (p.x < -p.width) this.pipes.splice(i, 1);
        }

        this.coins.forEach(c => {
            c.x -= speed;
            c.angle += 0.1;
            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - c.x, this.bird.y - c.y);
                if (dist < this.config.magnetRadius) {
                    c.x += (this.bird.x - c.x) * 0.15;
                    c.y += (this.bird.y - c.y) * 0.15;
                }
            }
        });
        
        const bX = this.bird.x + this.bird.size/2;
        const bY = this.bird.y + this.bird.size/2;
        
        this.coins = this.coins.filter(c => {
            if (Math.hypot(bX - c.x, bY - c.y) < 40) {
                if(window.state) {
                    window.state.coins++;
                    if(window.updateGlobalUI) window.updateGlobalUI();
                }
                return false;
            }
            return c.x > -50;
        });

        this.items.forEach(it => {
            it.x -= speed;
            it.osc += 0.05;
            it.y += Math.sin(it.osc) * 1.5;
        });
        
        this.items = this.items.filter(it => {
            if (Math.hypot(bX - it.x, bY - it.y) < 45) {
                this.activatePowerupEffect(it.type);
                if(window.updateGlobalUI) window.updateGlobalUI();
                return false;
            }
            return it.x > -50;
        });
    }


    // --- МЕТОД: ОТРИСОВКА (DRAW) ---
     draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // --- ЦВЕТА (КЛАССИЧЕСКИЕ ЗЕЛЕНЫЕ) ---
        const pipeColor = '#556b2f';    // Темный хаки
        const capColor = '#6b8e23';     // Оливковый
        const strokeColor = '#2d3419';  // Темный контур

        this.pipes.forEach(p => {
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = strokeColor;
            
            // ВЕРХНЯЯ ТРУБА
            this.ctx.fillStyle = pipeColor;
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            // Блик
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(p.x + 8, 0, 10, p.top);
            this.ctx.strokeRect(p.x, 0, p.width, p.top);
            
            // ШАПКА ВЕРХНЕЙ
            this.ctx.fillStyle = capColor;
            this.ctx.fillRect(p.x - 5, p.top - 20, p.width + 10, 20);
            this.ctx.strokeRect(p.x - 5, p.top - 20, p.width + 10, 20);

            // НИЖНЯЯ ТРУБА
            this.ctx.fillStyle = pipeColor;
            this.ctx.fillRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
            // Блик
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(p.x + 8, p.bottom, 10, window.innerHeight - p.bottom);
            this.ctx.strokeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
            
            // ШАПКА НИЖНЕЙ
            this.ctx.fillStyle = capColor;
            this.ctx.fillRect(p.x - 5, p.bottom, p.width + 10, 20);
            this.ctx.strokeRect(p.x - 5, p.bottom, p.width + 10, 20);
        });
        // 2. Рисуем землю
        this.drawGround();

        // 3. Рисуем монеты
        this.coins.forEach(c => {
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            // Эффект вращения (сплющивание по ширине)
            this.ctx.scale(Math.abs(Math.cos(c.angle)), 1);
            this.ctx.fillStyle = "#FFD700"; // Золото
            this.ctx.beginPath(); 
            this.ctx.arc(0, 0, 12, 0, Math.PI*2); 
            this.ctx.fill();
            this.ctx.strokeStyle = "#b36b15"; 
            this.ctx.stroke();
            this.ctx.restore();
        });

        // 4. Рисуем бонусы (Иконки)
        this.ctx.font = "35px Arial";
        this.items.forEach(it => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' };
            this.ctx.fillText(icons[it.type] || '🎁', it.x - 15, it.y + 10);
        });

        // 5. Рисуем Птицу
        this.ctx.save();
        
        // Если Призрак — делаем полупрозрачной
        if (this.isGhost || this.activePowerups.ghost > 0) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Если активен Щит — рисуем круг вокруг птицы
        if (this.activePowerups.shield > 0) {
            this.ctx.beginPath();
            this.ctx.arc(this.bird.x + this.bird.size/2, this.bird.y + this.bird.size/2, this.bird.size, 0, Math.PI*2);
            this.ctx.strokeStyle = "rgba(0, 255, 255, 0.7)"; // Неоновый голубой
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        // Поворот и отрисовка спрайта
        this.ctx.translate(this.bird.x + this.bird.size/2, this.bird.y + this.bird.size/2);
        this.ctx.rotate(this.bird.rotation);
        const img = this.birdSprites[this.frameIndex];
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size/2, -this.bird.size/2, this.bird.size, this.bird.size);
        }
        this.ctx.restore();
    }

    // --- МЕТОД: РИСОВАНИЕ ЗЕМЛИ ---
    drawGround() {
        const ctx = this.ctx;
        const g = this.ground;
        const y = window.innerHeight - g.h;
        if (g.img.complete) {
            // Рисуем тайлы земли друг за другом
            for (let i = 0; i <= Math.ceil(this.canvas.width / g.realWidth) + 1; i++) {
                ctx.drawImage(g.img, i * g.realWidth + g.offsetX, y, g.realWidth, g.h);
            }
        }
    }

    // --- МЕТОД: ОБРАБОТКА ВВОДА (ПРЫЖОК) ---
    handleInput(e) {
        if (!this.isRunning || this.isPaused) return;
        if (e && e.type === 'touchstart') e.preventDefault();
        
        this.bird.velocity = this.jump; // Прыжок
        
        // Вибрация при прыжке
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    // --- МЕТОД: КОНЕЦ ИГРЫ ---
    gameOver() {
        if (!this.isRunning) return;
        this.isRunning = false;
        
        // Скрываем панель способностей
        const panel = document.querySelector('.arcade-powers-layout');
        if (panel) panel.style.display = 'none';
        
        // Вызываем колбек (main.js покажет экран проигрыша)
        if (this.onGameOver) this.onGameOver(this.score, this.reviveUsed);
    }

    // --- МЕТОД: ИГРОВОЙ ЦИКЛ (LOOP) ---
    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    }

    // --- МЕТОД: ОЧИСТКА ---
    destroy() {
        this.isRunning = false;
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
    }
}
