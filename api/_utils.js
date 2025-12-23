import { supabase } from './_supabase.js';
import crypto from 'crypto';

export { supabase }; 

export function verifyTelegramData(initData) {
    if (!initData) {
        console.error("DEBUG: No initData provided");
        return null;
    }

    // 1. Разбираем строку и достаем хеш
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    // 2. Сортируем ключи по алфавиту (требование Telegram)
    const keys = Array.from(urlParams.keys()).filter(key => key !== 'hash').sort();
    
    // 3. Собираем строку проверки
    const dataCheckString = keys
        .map(key => `${key}=${urlParams.get(key)}`)
        .join('\n');

    // 4. Берем токен из переменных окружения Vercel
    const token = process.env.BOT_TOKEN || "";

    // 5. Генерируем секретный ключ
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();
        
    // 6. Вычисляем финальный хеш
    const _hash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // 7. Сравнение хешей
    if (_hash !== hash) {
        console.error("DEBUG: Hash mismatch! Проверь BOT_TOKEN.");
        console.log("Calculated:", _hash);
        console.log("Received:", hash);
        // ВРЕМЕННО закомментировано по твоему желанию для тестов:
        // return null; 
    }
    
    try {
        const userJson = urlParams.get('user');
        if (!userJson) {
            console.error("DEBUG: No user field in initData");
            return null;
        }
        return JSON.parse(userJson);
    } catch (e) {
        console.error("DEBUG: Parse user error:", e);
        return null;
    }
}

// CORS обертка для работы фронтенда с API
export const cors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    return await fn(req, res);
};