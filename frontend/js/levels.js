/**
 * frontend/js/levels.js - ПОЛНАЯ КОНФИГУРАЦИЯ (СИНХРОНИЗИРОВАНО С ДВИЖКОМ)
 */
export const LEVELS = [
    // --- ЭТАП 1: ОБУЧЕНИЕ (1-10) ---
    { id: 1,  targetScore: 5,   pipeSpeed: 3.0, gap: 175, spawnInterval: 1800, pipeColor: '#75b85b' },
    { id: 2,  targetScore: 8,   pipeSpeed: 3.1, gap: 170, spawnInterval: 1750, pipeColor: '#75b85b' },
    { id: 3,  targetScore: 10,  pipeSpeed: 3.2, gap: 165, spawnInterval: 1700, pipeColor: '#75b85b' },
    { id: 4,  targetScore: 12,  pipeSpeed: 3.3, gap: 160, spawnInterval: 1650, pipeColor: '#75b85b' },
    { id: 5,  targetScore: 15,  pipeSpeed: 3.4, gap: 155, spawnInterval: 1600, pipeColor: '#75b85b' },
    { id: 6,  targetScore: 18,  pipeSpeed: 3.5, gap: 150, spawnInterval: 1550, pipeColor: '#27ae60' },
    { id: 7,  targetScore: 20,  pipeSpeed: 3.6, gap: 148, spawnInterval: 1500, pipeColor: '#27ae60' },
    { id: 8,  targetScore: 22,  pipeSpeed: 3.7, gap: 146, spawnInterval: 1480, pipeColor: '#27ae60' },
    { id: 9,  targetScore: 25,  pipeSpeed: 3.8, gap: 144, spawnInterval: 1460, pipeColor: '#27ae60' },
    { id: 10, targetScore: 30,  pipeSpeed: 4.0, gap: 140, spawnInterval: 1400, pipeColor: '#27ae60' },

    // --- ЭТАП 2: РАЗМИНКА (11-20) ---
    { id: 11, targetScore: 32,  pipeSpeed: 4.1, gap: 138, spawnInterval: 1380, pipeColor: '#f1c40f' },
    { id: 12, targetScore: 34,  pipeSpeed: 4.2, gap: 136, spawnInterval: 1360, pipeColor: '#f1c40f' },
    { id: 13, targetScore: 36,  pipeSpeed: 4.3, gap: 134, spawnInterval: 1340, pipeColor: '#f1c40f' },
    { id: 14, targetScore: 38,  pipeSpeed: 4.4, gap: 132, spawnInterval: 1320, pipeColor: '#f1c40f' },
    { id: 15, targetScore: 40,  pipeSpeed: 4.5, gap: 130, spawnInterval: 1300, pipeColor: '#f39c12' },
    { id: 16, targetScore: 42,  pipeSpeed: 4.6, gap: 128, spawnInterval: 1280, pipeColor: '#f39c12' },
    { id: 17, targetScore: 44,  pipeSpeed: 4.7, gap: 126, spawnInterval: 1260, pipeColor: '#f39c12' },
    { id: 18, targetScore: 46,  pipeSpeed: 4.8, gap: 124, spawnInterval: 1240, pipeColor: '#f39c12' },
    { id: 19, targetScore: 48,  pipeSpeed: 4.9, gap: 122, spawnInterval: 1220, pipeColor: '#f39c12' },
    { id: 20, targetScore: 50,  pipeSpeed: 5.0, gap: 120, spawnInterval: 1200, pipeColor: '#e67e22' },

    // --- ЭТАП 3: ОПАСНАЯ ЗОНА (21-30) ---
    { id: 21, targetScore: 55,  pipeSpeed: 5.2, gap: 119, spawnInterval: 1150, pipeColor: '#e67e22' },
    { id: 22, targetScore: 60,  pipeSpeed: 5.4, gap: 118, spawnInterval: 1120, pipeColor: '#e67e22' },
    { id: 23, targetScore: 65,  pipeSpeed: 5.6, gap: 117, spawnInterval: 1100, pipeColor: '#e67e22' },
    { id: 24, targetScore: 70,  pipeSpeed: 5.8, gap: 116, spawnInterval: 1080, pipeColor: '#d35400' },
    { id: 25, targetScore: 75,  pipeSpeed: 6.0, gap: 115, spawnInterval: 1050, pipeColor: '#d35400' },
    { id: 26, targetScore: 80,  pipeSpeed: 6.1, gap: 114, spawnInterval: 1030, pipeColor: '#d35400' },
    { id: 27, targetScore: 85,  pipeSpeed: 6.2, gap: 113, spawnInterval: 1010, pipeColor: '#d35400' },
    { id: 28, targetScore: 90,  pipeSpeed: 6.3, gap: 112, spawnInterval: 990,  pipeColor: '#c0392b' },
    { id: 29, targetScore: 95,  pipeSpeed: 6.4, gap: 111, spawnInterval: 970,  pipeColor: '#c0392b' },
    { id: 30, targetScore: 100, pipeSpeed: 6.5, gap: 110, spawnInterval: 950,  pipeColor: '#c0392b' },

    // --- ЭТАП 4: КИБЕРПАНК (31-40) ---
    { id: 31, targetScore: 110, pipeSpeed: 6.7, gap: 109, spawnInterval: 930,  pipeColor: '#9b59b6' },
    { id: 32, targetScore: 120, pipeSpeed: 6.9, gap: 108, spawnInterval: 910,  pipeColor: '#9b59b6' },
    { id: 33, targetScore: 130, pipeSpeed: 7.1, gap: 107, spawnInterval: 890,  pipeColor: '#9b59b6' },
    { id: 34, targetScore: 140, pipeSpeed: 7.3, gap: 106, spawnInterval: 870,  pipeColor: '#8e44ad' },
    { id: 35, targetScore: 150, pipeSpeed: 7.5, gap: 105, spawnInterval: 850,  pipeColor: '#8e44ad' },
    { id: 36, targetScore: 160, pipeSpeed: 7.6, gap: 105, spawnInterval: 840,  pipeColor: '#8e44ad' },
    { id: 37, targetScore: 170, pipeSpeed: 7.7, gap: 105, spawnInterval: 830,  pipeColor: '#2c3e50' },
    { id: 38, targetScore: 180, pipeSpeed: 7.8, gap: 104, spawnInterval: 820,  pipeColor: '#2c3e50' },
    { id: 39, targetScore: 190, pipeSpeed: 7.9, gap: 104, spawnInterval: 810,  pipeColor: '#2c3e50' },
    { id: 40, targetScore: 200, pipeSpeed: 8.0, gap: 103, spawnInterval: 800,  pipeColor: '#34495e' },

    // --- ЭТАП 5: АД (41-50) ---
    { id: 41, targetScore: 210, pipeSpeed: 8.1, gap: 103, spawnInterval: 790,  pipeColor: '#1a1a1a' },
    { id: 42, targetScore: 220, pipeSpeed: 8.2, gap: 102, spawnInterval: 780,  pipeColor: '#1a1a1a' },
    { id: 43, targetScore: 230, pipeSpeed: 8.3, gap: 102, spawnInterval: 770,  pipeColor: '#1a1a1a' },
    { id: 44, targetScore: 240, pipeSpeed: 8.4, gap: 102, spawnInterval: 760,  pipeColor: '#1a1a1a' },
    { id: 45, targetScore: 250, pipeSpeed: 8.5, gap: 101, spawnInterval: 750,  pipeColor: '#c0392b' },
    { id: 46, targetScore: 260, pipeSpeed: 8.6, gap: 101, spawnInterval: 740,  pipeColor: '#c0392b' },
    { id: 47, targetScore: 270, pipeSpeed: 8.7, gap: 101, spawnInterval: 730,  pipeColor: '#c0392b' },
    { id: 48, targetScore: 280, pipeSpeed: 8.8, gap: 100, spawnInterval: 720,  pipeColor: '#000000' },
    { id: 49, targetScore: 290, pipeSpeed: 8.9, gap: 100, spawnInterval: 710,  pipeColor: '#000000' },
    { id: 50, targetScore: 500, pipeSpeed: 9.5, gap: 100, spawnInterval: 650,  pipeColor: '#ff0000' }
];