

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir, level = 0) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        // Игнорируем только системный хлам
        if (['node_modules', '.git', '.vercel'].includes(file)) return;
        
        const fullPath = path.join(dir, file);
        const isDir = fs.statSync(fullPath).isDirectory();
        
        console.log('  '.repeat(level) + (isDir ? '📂 ' : '📄 ') + file);
        
        if (isDir) {
            walk(fullPath, level + 1);
        }
    });
}

console.log('--- ПОЛНЫЙ СПИСОК ФАЙЛОВ ПРОЕКТА ---');
try {
    walk(__dirname);
} catch (e) {
    console.log('Ошибка:', e.message);
}