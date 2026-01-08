/**
 * arcade.js - Полная логика игры с комментариями каждой строки
 */
export class ArcadeGame {
    // Конструктор: инициализация холста и обратного вызова при смерти
    constructor(canvas, onGameOver) {
        this.canvas = canvas; // Сохраняем ссылку на элемент холста
        this.ctx = canvas.getContext('2d'); // Получаем 2D контекст для рисования
        this.onGameOver = onGameOver; // Функция, которая вызовется при конце игры
        // --- ИНИЦИАЛИЗАЦИЯ ЗЕМЛИ (как в Classic) ---
this.ground = {
    img: new Image(),
    offsetX: 0,
    h: 100,           // Высота земли
    realWidth: 512,   // Ширина файла
    realHeight: 162   // Высота файла
};
this.ground.img.src = '/frontend/assets/ground.png';
        // Параметры птицы: координаты, размер, скорость падения и угол наклона
        this.bird = { x: 50, y: 0, size: 45, velocity: 0, rotation: 0 }; 
        this.pipes = []; // Массив для активных труб
        this.coins = []; // Массив для всех монет на экране
        this.items = []; // Массив для выпадающих бонусов (способностей)
        this.score = 0; // Текущий счет очков (пройденные трубы)
        
        this.isRunning = false; // Состояние: идет ли игра сейчас
        this.isPaused = false; // Состояние: стоит ли игра на паузе

        // Таймеры активных способностей (в кадрах)
        this.activePowerups = { shield: 0, magnet: 0, ghost: 0, gap: 0 };
        // Глобальные настройки шансов и длительности
        this.config = {
            itemChance: 0.3, // Шанс появления предмета (не используется напрямую здесь)
            magnetRadius: 200, // Радиус, в котором монеты летят к птице
            powerupDuration: 420, // Длительность бонуса (ок. 7 секунд при 60 FPS)
        };

        // Загрузка изображений птицы для анимации взмаха крыльев
        this.birdSprites = [];
        ['bird1.png', 'bird2.png', 'bird3.png'].forEach(src => {
            const img = new Image();
            img.src = `assets/${src}`; // Путь к файлам в папке assets
            this.birdSprites.push(img); // Добавляем в массив загрузок
        });

        this.animFrame = 0; // Текущий кадр анимации (0, 1 или 2)
        this.tickCount = 0; // Счетчик кадров для генерации труб
        this.itemTimer = 0; // Счетчик кадров для генерации бонусов

        // Привязка контекста 'this' к методам, чтобы не терять его в обработчиках
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.resize = this.resize.bind(this);

        this.initEvents(); // Запуск прослушивания кликов
        this.resize(); // Начальная подстройка под размер экрана
        this.activePowerups = {
            shield: 0,   // таймер или флаг
            gap: 0,
            ghost: 0,
            magnet: 0
        };

    }
    activatePowerupEffect(id) {
    console.log(`🚀 Активирована способность: ${id}`);
    
    switch(id) {
        case 'shield':
            this.activePowerups.shield = 500; 
            break; // ОБЯЗАТЕЛЬНО
        case 'gap':
            this.activePowerups.gap = 600; 
            break; // ОБЯЗАТЕЛЬНО (удалил лишний setTimeout и старые переменные)
        case 'ghost':
            this.activePowerups.ghost = 300; 
            break;
        case 'magnet':
            this.activePowerups.magnet = 600; 
            break;
    }
}

    // Регистрация событий касания и клика
    initEvents() {
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON') return; // Если нажали на кнопку интерфейса — не прыгаем
            e.preventDefault(); // Предотвращаем скролл страницы при игре
            this.handleInput(); // Вызываем прыжок
        }, { passive: false });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return; // Проверка на кнопки
            this.handleInput(); // Вызываем прыжок
        });
        window.addEventListener('resize', this.resize); // Пересчет размеров при повороте экрана
    }

    // Подстройка холста под разрешение экрана (с учетом Retina-дисплеев)
       resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        const isDesktop = h > 800;
        this.bird.x = w / 4; 
        if (!this.isRunning) this.bird.y = h / 2;

        // Физика (как в Game.js)
        this.gravity = isDesktop ? 0.45 : h * 0.0006;
        this.jump = isDesktop ? -9 : -h * 0.013; // Сильный прыжок
        this.pipeSpeed = isDesktop ? 4 : w * 0.008;
        this.pipeSpawnThreshold = Math.max(80, Math.floor(100 * (w / 375)));
    }


    // Сброс всех параметров и начало новой игры
    start() {
        this.score = 0; // Обнуляем очки
        this.pipes = []; // Очищаем трубы
        this.coins = []; // Очищаем монеты
        this.items = []; // Очищаем бонусы
        this.activePowerups = { shield: 0, magnet: 0, ghost: 0, gap: 0 }; // Сброс баффов
        this.bird.y = window.innerHeight / 2; // Птица по центру
        this.bird.velocity = 0; // Скорость падения ноль
        this.bird.rotation = 0; // Наклон ноль
        this.isRunning = true; // Запуск цикла
        this.loop(); // Запуск рендеринга
    }

    // Оживление после смерти (использование сердечка)
       revive() {
        this.isRunning = true;
        this.reviveUsed = true;
        
        // Подброс
        this.bird.velocity = -4; 
        
        // Удаляем трубы рядом
        this.pipes = this.pipes.filter(p => p.x < this.bird.x - 100 || p.x > this.bird.x + 300);
        
        // Неуязвимость
        this.isGhost = true;
        setTimeout(() => { this.isGhost = false; }, 2000);
        
        this.loop();
    }


    // Создание новой трубы и пачки монет
    spawnPipe() {
    const gapBase = window.innerHeight * 0.18;
    const gapLarge = window.innerHeight * 0.30;
    const currentGap = this.activePowerups.gap > 0 ? gapLarge : gapBase;

    const bottomLimit = window.innerHeight / 3;
    const minH = 80; 
    
    // Рассчитываем maxH один раз с защитой
    let maxH = window.innerHeight - currentGap - bottomLimit;
    if (maxH <= minH) maxH = minH + 20;

    // Рассчитываем h один раз
    const h = Math.floor(Math.random() * (maxH - minH)) + minH;

    // Создаем объект трубы
    const p = { x: window.innerWidth, width: 70, top: h, bottom: h + currentGap, passed: false };
    this.pipes.push(p);

    // ... спавн монет (оставляем как есть) ...

        // СПАВН 10 МОНЕТ В РЯД (Твой запрос)
        const coinsCount = 5; 
        for (let i = 0; i < coinsCount; i++) {
            this.coins.push({
                x: p.x + p.width + (i * 55) + (Math.random() * 20), // Идут друг за другом с небольшим разбросом
                y: h + (currentGap / 2) + (Math.random() * 60 - 30), // Центрированы в проеме с отклонением
                collected: false, // Флаг: собрана или нет
                angle: Math.random() * Math.PI // Рандомный угол для красоты вращения
            });
        }
    }

    // Обновление физики и логики (каждый кадр)
    update() {
        if (!this.isRunning || this.isPaused) return; // Если стоим — ничего не считаем

        this.bird.velocity += this.gravity; // Применяем гравитацию к скорости
        this.bird.y += this.bird.velocity; // Применяем скорость к координате Y
        
        // Поворот птицы: смотрим вверх при прыжке, вниз при падении
        this.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.bird.velocity / 12)));
// Прокрутка земли
this.ground.offsetX -= this.pipeSpeed;
if (this.ground.offsetX <= -this.ground.realWidth) {
    this.ground.offsetX = 0;
}

// Коллизия с землей (вместо старой проверки низа экрана)
const groundTop = window.innerHeight - this.ground.h;
if (this.bird.y + this.bird.size > groundTop) {
    this.bird.y = groundTop - this.bird.size; 
    this.gameOver();
    return;
}
        // Уменьшение таймеров способностей
        Object.keys(this.activePowerups).forEach(key => {
            if (this.activePowerups[key] > 0) this.activePowerups[key]--;
        });

        // Логика появления бонусов (раз в 500 тиков)
        this.itemTimer++;
        if (this.itemTimer > 500) {
            const types = ['shield', 'magnet', 'ghost', 'gap']; // Список типов
            this.items.push({
                x: window.innerWidth + 50, // Появляется за правым краем
                y: Math.random() * (window.innerHeight - 200) + 100, // Рандомная высота
                type: types[Math.floor(Math.random() * types.length)], // Рандомный тип
                osc: 0 // Для анимации плавного плавания вверх-вниз
            });
            this.itemTimer = 0; // Сброс таймера
        }

        // СПАВН СЛУЧАЙНЫХ МОНЕТ В НЕБЕ (Твой запрос)
       // СПАВН СЛУЧАЙНЫХ МОНЕТ В НЕБЕ
// СПАВН СЛУЧАЙНЫХ МОНЕТ В НЕБЕ
if (this.tickCount % 600 === 0) {
    const minSpawnY = window.innerHeight / 5; // Верхняя граница (1/5 экрана)
    const groundTop = window.innerHeight - this.ground.h; // Начало земли
    const maxSpawnY = groundTop - 50; // Нижняя граница (чуть выше земли)

    for (let i = 0; i < 5; i++) {
        this.coins.push({
            x: window.innerWidth + 50 + (i * 30),
            // Генерируем Y строго между 1/5 экрана и землей
            y: Math.random() * (maxSpawnY - minSpawnY) + minSpawnY,
            collected: false,
            angle: 0
        });
    }
}
        this.updateElements(); // Двигаем трубы, монеты и т.д.
        this.checkCollisions(); // Проверяем удары и сбор предметов

        // Проверка: не вылетела ли птица за границы экрана
    
    }

    // Движение всех объектов влево
    updateElements() {
        const speed = this.pipeSpeed; // Текущая скорость игры
        
        this.pipes.forEach(p => p.x -= speed); // Двигаем трубы
        // Двигаем бонусы и заставляем их плавать по синусоиде
        this.items.forEach(it => { it.x -= speed; it.osc += 0.05; it.y += Math.sin(it.osc) * 1.5; });

        this.coins.forEach(c => {
            c.x -= speed; // Двигаем монеты
            c.angle += 0.1; // Вращаем их
            
            // ЕСЛИ АКТИВИРОВАН МАГНИТ
            if (this.activePowerups.magnet > 0) {
                const dist = Math.hypot(this.bird.x - c.x, this.bird.y - c.y); // Расстояние до птицы
                if (dist < this.config.magnetRadius) { // Если в радиусе действия
                    c.x += (this.bird.x - c.x) * 0.2; // Тянем по X (ускоренно)
                    c.y += (this.bird.y - c.y) * 0.2; // Тянем по Y (ускоренно)
                }
            }
        });

        // Очистка массивов: удаляем объекты, которые улетели далеко влево
        this.pipes = this.pipes.filter(p => p.x > -p.width);
        this.coins = this.coins.filter(c => c.x > -50 && !c.collected);
        this.items = this.items.filter(it => it.x > -50);
        
        // Проверка: пора ли создавать новую трубу?
        if (++this.tickCount > this.pipeSpawnThreshold) {
            this.spawnPipe(); // Создаем трубу
            this.tickCount = 0; // Сброс счетчика
        }
    }

    // Проверка столкновений
    checkCollisions() {
        const b = this.bird; // Ссылка для удобства
        const pad = 10; // "Мягкое" столкновение (отступ от краев спрайта)

        // Проверка труб
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            // Проверка на пересечение по X и по Y
            const hitX = b.x + b.size - pad > p.x && b.x + pad < p.x + p.width;
            const hitY = b.y + pad < p.top || b.y + b.size - pad > p.bottom;

            if (hitX && hitY) {
                if (this.activePowerups.ghost > 0) continue; // Если призрак — летим сквозь
                if (this.activePowerups.shield > 0) { // Если щит
                    this.activePowerups.shield = 0; // Ломаем щит
                    this.pipes.splice(i, 1); // Удаляем эту трубу
                    if (window.updateGlobalUI) window.updateGlobalUI(); // Обновляем UI (иконку щита)
                    continue; // Живем дальше
                }
                this.gameOver(); // Иначе — смерть
                return;
            }

            // Начисление очков, если труба пройдена
            if (!p.passed && p.x + p.width < b.x) {
                p.passed = true;
                this.score++;
                
                // Прогресс ежедневного задания №1 (Трубы)
                if (window.state?.user?.daily_challenges) {
                    const task = window.state.user.daily_challenges.find(c => c.id === 1);
                    if (task && !task.done) {
                        task.progress++;
                        if (task.progress >= task.target) task.done = true;
                    }
                }

                // Обновление цифры счета на экране
                const scoreEl = document.getElementById('score-overlay');
                if (scoreEl) scoreEl.innerText = this.score;
            }
        }

        // Центр птицы для более точного сбора монет
        const bCenterX = b.x + b.size / 2;
        const bCenterY = b.y + b.size / 2;

        // Сбор монет
       this.coins.forEach(c => {
    // Проверка дистанции между центром птицы и монетой
    if (!c.collected && Math.hypot(bCenterX - c.x, bCenterY - c.y) < 35) {
        c.collected = true; // Помечаем монету как собранную
        
        if (window.state) {
            // 1. Увеличиваем монеты в глобальном стейте
            window.state.coins = (window.state.coins || 0) + 1;

            // 2. Проверяем наличие заданий (Daily Challenges) максимально безопасно
            // Используем ?. чтобы код не падал, если user или задания еще не загружены
            const challenges = window.state.user?.daily_challenges;
            
            if (Array.isArray(challenges)) {
                const coinTask = challenges.find(t => t.id === 2); // ID 2 - сбор монет
                if (coinTask && !coinTask.done) {
                    coinTask.progress++;
                    if (coinTask.progress >= coinTask.target) {
                        coinTask.done = true;
                    }
                }
            }

            // 3. Обновляем UI (интерфейс)
            // Вызываем твою функцию из main.js
            if (typeof window.updateGlobalUI === 'function') {
                window.updateGlobalUI();
            }
        }
    }
});
        
        // Сбор бонусов
        this.items.forEach((it, idx) => {
            if (Math.hypot(bCenterX - it.x, bCenterY - it.y) < 40) {
                this.activePowerups[it.type] = this.config.powerupDuration; // Активируем время действия
                this.items.splice(idx, 1); // Удаляем иконку с экрана
                
                // Прогресс ежедневного задания №3 (Способности)
                const task = window.state.user.daily_challenges?.find(c => c.id === 3);
                if (task && !task.done) { task.progress++; task.done = true; }
                
                if (window.updateGlobalUI) window.updateGlobalUI(); // Показываем активный бафф
            }
        });
    }

    // Отрисовка всей графики
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Чистим холст
        
        // --- ОТРИСОВКА ТРУБ (ЦВЕТ ХАКИ И УТОЛЩЕНИЯ) ---
        const pipeColor = '#556b2f';    // Темный хаки для тела трубы
        const capColor = '#6b8e23';     // Оливковый для "шапки"
        const strokeColor = '#2d3419';  // Темный контур
        const capHeight = 20;           // Высота утолщения
        const capGap = 5;               // На сколько шапка шире трубы

       this.pipes.forEach(p => {
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = strokeColor;

            // --- 1. ВЕРХНЯЯ ТРУБА ---
            this.ctx.fillStyle = pipeColor;
            this.ctx.fillRect(p.x, 0, p.width, p.top);
            
            // Добавляем блик для объема (светлая полоса слева)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(p.x + 8, 0, 10, p.top);
            
            this.ctx.strokeRect(p.x, 0, p.width, p.top);
            
            // Шапка верхней трубы
            this.ctx.fillStyle = capColor;
            this.ctx.fillRect(p.x - capGap, p.top - capHeight, p.width + (capGap * 2), capHeight);
            this.ctx.strokeRect(p.x - capGap, p.top - capHeight, p.width + (capGap * 2), capHeight);

            // --- 2. НИЖНЯЯ ТРУБА ---
            this.ctx.fillStyle = pipeColor;
            this.ctx.fillRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);
            
            // Добавляем блик для объема
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(p.x + 8, p.bottom, 10, window.innerHeight - p.bottom);
            
            this.ctx.strokeRect(p.x, p.bottom, p.width, window.innerHeight - p.bottom);

            // Шапка нижней трубы
            this.ctx.fillStyle = capColor;
            this.ctx.fillRect(p.x - capGap, p.bottom, p.width + (capGap * 2), capHeight);
            this.ctx.strokeRect(p.x - capGap, p.bottom, p.width + (capGap * 2), capHeight);
        });
       
       


        // Отрисовка монет
        this.coins.forEach(c => {
            this.ctx.save();
            this.ctx.translate(c.x, c.y); // Переходим в координаты монеты
            this.ctx.scale(Math.abs(Math.cos(c.angle)), 1); // Эффект вращения через сжатие по ширине
            this.ctx.fillStyle = "#FFD700"; // Золотой цвет
            this.ctx.beginPath(); this.ctx.arc(0, 0, 12, 0, Math.PI*2); this.ctx.fill();
            this.ctx.strokeStyle = "#b36b15"; this.ctx.stroke(); // Медная обводка
            this.ctx.restore();
        });

        // Отрисовка бонусов
        this.ctx.font = "35px Arial";
        this.items.forEach(it => {
            const icons = { shield: '🛡️', magnet: '🧲', ghost: '👻', gap: '↔️' }; // Сопоставление иконок
            this.ctx.fillText(icons[it.type] || '🎁', it.x - 12, it.y + 10);
        });

        this.drawGround(); // Отрисовываем землю поверх труб

        // Отрисовка птицы
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.size/2, this.bird.y + this.bird.size/2); // Перенос в центр птицы
        this.ctx.rotate(this.bird.rotation); // Поворот
        
        if (this.activePowerups.ghost > 0) this.ctx.globalAlpha = 0.5; // Полупрозрачность, если призрак

        // Эффект светящегося щита вокруг птицы
        if (this.activePowerups.shield > 0) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.bird.size * 0.9, 0, Math.PI * 2);
            this.ctx.strokeStyle = "rgba(0, 255, 255, 0.6)"; // Неоновый голубой
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }

        // Анимация кадров: меняем картинку каждые 100мс
        this.animFrame = (Math.floor(Date.now() / 100) % 3);
        const img = this.birdSprites[this.animFrame]; 
        
        if (img && img.complete) {
            this.ctx.drawImage(img, -this.bird.size/2, -this.bird.size/2, this.bird.size, this.bird.size);
        } else {
            // Фолбэк на случай, если картинка не загрузилась
            this.ctx.fillStyle = "yellow";
            this.ctx.fillRect(-this.bird.size/2, -this.bird.size/2, this.bird.size, this.bird.size);
        }
        this.ctx.restore(); // Возвращаем контекст в исходное состояние
    }

    drawGround() {
    const ctx = this.ctx;
    const g = this.ground;
    const y = window.innerHeight - g.h;

    if (g.img.complete) {
        for (let i = 0; i <= Math.ceil(this.canvas.width / g.realWidth) + 1; i++) {
            ctx.drawImage(
                g.img, 
                i * g.realWidth + g.offsetX, 
                y, 
                g.realWidth, 
                g.h
            );
        }
    }
}

    // Завершение игры
    gameOver() {
        if (!this.isRunning) return; // Чтобы не вызывать дважды
        this.isRunning = false; // Останавливаем логику
        // Скрываем панель способностей при смерти
    const panel = document.getElementById('arcade-powerups-panel');
    if (panel) panel.classList.add('hidden');

        if (this.onGameOver) this.onGameOver(this.score); // Сообщаем внешнему коду результат
    }

    // Главный игровой цикл
    loop() {
        if (!this.isRunning) return; // Если игра стоп — прекращаем рекурсию
        this.update(); // Расчет физики
        this.draw(); // Рисование
        requestAnimationFrame(this.loop); // Просим браузер вызвать нас снова перед следующим обновлением экрана
    }

    // Обработка ввода (прыжок)
    handleInput() { 
        if (!this.isRunning || this.isPaused) return; // Прыгаем только в активной игре
        this.bird.velocity = this.jump; // Устанавливаем вертикальную скорость равной силе прыжка
    }
}