/**
 * js/levels.js - ПОЛНАЯ КОНФИГУРАЦИЯ (50 УРОВНЕЙ)
 */
export const LEVELS = [
    // --- ЭТАП 1: ОБУЧЕНИЕ (1-10) ---
    // Медленно, широкие проходы
    { id: 1,  target: 5,   speed: 3.0, gap: 175, bg: 'fon.png', pipeColor: '#75b85b' },
    { id: 2,  target: 8,   speed: 3.1, gap: 170, bg: 'fon.png', pipeColor: '#75b85b' },
    { id: 3,  target: 10,  speed: 3.2, gap: 165, bg: 'fon.png', pipeColor: '#75b85b' },
    { id: 4,  target: 12,  speed: 3.3, gap: 160, bg: 'fon.png', pipeColor: '#75b85b' },
    { id: 5,  target: 15,  speed: 3.4, gap: 155, bg: 'fon.png', pipeColor: '#75b85b' },
    { id: 6,  target: 18,  speed: 3.5, gap: 150, bg: 'fon.png', pipeColor: '#27ae60' },
    { id: 7,  target: 20,  speed: 3.6, gap: 148, bg: 'fon.png', pipeColor: '#27ae60' },
    { id: 8,  target: 22,  speed: 3.7, gap: 146, bg: 'fon.png', pipeColor: '#27ae60' },
    { id: 9,  target: 25,  speed: 3.8, gap: 144, bg: 'fon.png', pipeColor: '#27ae60' },
    { id: 10, target: 30,  speed: 4.0, gap: 140, bg: 'fon.png', pipeColor: '#27ae60' },

    // --- ЭТАП 2: РАЗМИНКА (11-20) ---
    // Скорость растет, коридоры сужаются
    { id: 11, target: 32,  speed: 4.1, gap: 138, bg: 'fon.png', pipeColor: '#f1c40f' },
    { id: 12, target: 34,  speed: 4.2, gap: 136, bg: 'fon.png', pipeColor: '#f1c40f' },
    { id: 13, target: 36,  speed: 4.3, gap: 134, bg: 'fon.png', pipeColor: '#f1c40f' },
    { id: 14, target: 38,  speed: 4.4, gap: 132, bg: 'fon.png', pipeColor: '#f1c40f' },
    { id: 15, target: 40,  speed: 4.5, gap: 130, bg: 'fon.png', pipeColor: '#f39c12' },
    { id: 16, target: 42,  speed: 4.6, gap: 128, bg: 'fon.png', pipeColor: '#f39c12' },
    { id: 17, target: 44,  speed: 4.7, gap: 126, bg: 'fon.png', pipeColor: '#f39c12' },
    { id: 18, target: 46,  speed: 4.8, gap: 124, bg: 'fon.png', pipeColor: '#f39c12' },
    { id: 19, target: 48,  speed: 4.9, gap: 122, bg: 'fon.png', pipeColor: '#f39c12' },
    { id: 20, target: 50,  speed: 5.0, gap: 120, bg: 'fon.png', pipeColor: '#e67e22' },

    // --- ЭТАП 3: ОПАСНАЯ ЗОНА (21-30) ---
    // Средняя скорость, высокая плотность труб
    { id: 21, target: 55,  speed: 5.2, gap: 119, bg: 'fon.png', pipeColor: '#e67e22' },
    { id: 22, target: 60,  speed: 5.4, gap: 118, bg: 'fon.png', pipeColor: '#e67e22' },
    { id: 23, target: 65,  speed: 5.6, gap: 117, bg: 'fon.png', pipeColor: '#e67e22' },
    { id: 24, target: 70,  speed: 5.8, gap: 116, bg: 'fon.png', pipeColor: '#d35400' },
    { id: 25, target: 75,  speed: 6.0, gap: 115, bg: 'fon.png', pipeColor: '#d35400' },
    { id: 26, target: 80,  speed: 6.1, gap: 114, bg: 'fon.png', pipeColor: '#d35400' },
    { id: 27, target: 85,  speed: 6.2, gap: 113, bg: 'fon.png', pipeColor: '#d35400' },
    { id: 28, target: 90,  speed: 6.3, gap: 112, bg: 'fon.png', pipeColor: '#c0392b' },
    { id: 29, target: 95,  speed: 6.4, gap: 111, bg: 'fon.png', pipeColor: '#c0392b' },
    { id: 30, target: 100, speed: 6.5, gap: 110, bg: 'fon.png', pipeColor: '#c0392b' },

    // --- ЭТАП 4: КИБЕРПАНК (31-40) ---
    // Очень быстро, маленькое окно для ошибки
    { id: 31, target: 110, speed: 6.7, gap: 109, bg: 'fon.png', pipeColor: '#9b59b6' },
    { id: 32, target: 120, speed: 6.9, gap: 108, bg: 'fon.png', pipeColor: '#9b59b6' },
    { id: 33, target: 130, speed: 7.1, gap: 107, bg: 'fon.png', pipeColor: '#9b59b6' },
    { id: 34, target: 140, speed: 7.3, gap: 106, bg: 'fon.png', pipeColor: '#8e44ad' },
    { id: 35, target: 150, speed: 7.5, gap: 105, bg: 'fon.png', pipeColor: '#8e44ad' },
    { id: 36, target: 160, speed: 7.6, gap: 105, bg: 'fon.png', pipeColor: '#8e44ad' },
    { id: 37, target: 170, speed: 7.7, gap: 105, bg: 'fon.png', pipeColor: '#2c3e50' },
    { id: 38, target: 180, speed: 7.8, gap: 104, bg: 'fon.png', pipeColor: '#2c3e50' },
    { id: 39, target: 190, speed: 7.9, gap: 104, bg: 'fon.png', pipeColor: '#2c3e50' },
    { id: 40, target: 200, speed: 8.0, gap: 103, bg: 'fon.png', pipeColor: '#34495e' },

    // --- ЭТАП 5: АД (41-50) ---
    // Режим "Безумие"
    { id: 41, target: 210, speed: 8.1, gap: 103, bg: 'fon.png', pipeColor: '#1a1a1a' },
    { id: 42, target: 220, speed: 8.2, gap: 102, bg: 'fon.png', pipeColor: '#1a1a1a' },
    { id: 43, target: 230, speed: 8.3, gap: 102, bg: 'fon.png', pipeColor: '#1a1a1a' },
    { id: 44, target: 240, speed: 8.4, gap: 102, bg: 'fon.png', pipeColor: '#1a1a1a' },
    { id: 45, target: 250, speed: 8.5, gap: 101, bg: 'fon.png', pipeColor: '#c0392b' },
    { id: 46, target: 260, speed: 8.6, gap: 101, bg: 'fon.png', pipeColor: '#c0392b' },
    { id: 47, target: 270, speed: 8.7, gap: 101, bg: 'fon.png', pipeColor: '#c0392b' },
    { id: 48, target: 280, speed: 8.8, gap: 100, bg: 'fon.png', pipeColor: '#000000' },
    { id: 49, target: 290, speed: 8.9, gap: 100, bg: 'fon.png', pipeColor: '#000000' },
    { id: 50, target: 500, speed: 9.5, gap: 100, bg: 'fon.png', pipeColor: '#ff0000' }
];