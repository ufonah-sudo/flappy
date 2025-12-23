import { supabase } from './_supabase.js';
import crypto from 'crypto';

export { supabase }; 

export function verifyTelegramData(initData) {
    if (!initData) {
        console.error("DEBUG: No initData provided");
        return null;
    }

    // Разбираем строку initData
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    // Telegram требует, чтобы ключи были отсортированы по алфавиту
    const keys = Array.from(urlParams.keys()).filter(key => key !== 'hash').sort();
    
    // Собираем строку проверки из ОРИГИНАЛЬНЫХ данных
    const dataCheckString = keys
        .map(key => `${key}=${urlParams.get(key)}`)
        .join('\n');

    const token = process.env.BOT_TOKEN || "";

    // 1. Создаем секретный ключ на основе токена бота
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();
        
    // 2. Вычисляем проверочный хеш
    const _hash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // Сравниваем
    if (_hash !== hash) {
        console.error("DEBUG: Hash mismatch!");
        console.log("Calculated:", _hash);
        console.log("Received:", hash);
        // Если ты хочешь ПРИНУДИТЕЛЬНО протестировать запись в базу, даже если хеш не совпал,
        // временно закомментируй строку ниже (только для теста!)
        return null; 
    }
    
    try {
        return JSON.parse(urlParams.get('user'));
    } catch (e) {
        console.error("DEBUG: Parse user error:", e);
        return null;
    }
}

// Обертка для CORS, чтобы фронтенд мог достучаться до API
export const cors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    return await fn(req, res);
};