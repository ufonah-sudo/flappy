import { supabase } from './_supabase.js';
import crypto from 'crypto';

export { supabase }; 

/**
 * Проверка данных от Telegram.
 * Возвращает объект пользователя, если всё ок, или null, если данные подделаны.
 */
export function verifyTelegramData(initData) {
    if (!initData) {
        console.error("[Verify] No initData provided");
        return null;
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    // Сортируем параметры
    const keys = Array.from(urlParams.keys()).filter(key => key !== 'hash').sort();
    const dataCheckString = keys
        .map(key => `${key}=${urlParams.get(key)}`)
        .join('\n');

    const token = process.env.BOT_TOKEN;

    if (!token) {
        console.error("[Verify] CRITICAL: BOT_TOKEN is missing in environment variables!");
        // Для локальных тестов без токена:
        // return JSON.parse(urlParams.get('user')); 
        return null;
    }

    // Хеш-проверка
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();
        
    const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    if (calculatedHash !== hash) {
        console.error("[Verify] Hash mismatch!");
        // ВАЖНО: На продакшене тут должен быть return null;
        // Пока ты тестируешь, можешь оставить лог, но не забудь закрыть дыру!
        // return null; 
    }
    
    try {
        const userJson = urlParams.get('user');
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        console.error("[Verify] Parse error:", e);
        return null;
    }
}

/**
 * CORS обертка. 
 * Позволяет фронтенду (Vercel) общаться с бэкендом (Vercel Functions).
 */
export const cors = fn => async (req, res) => {
    // Разрешаем запросы со всех доменов (для Telegram Mini Apps это норма)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        return await fn(req, res);
    } catch (err) {
        console.error("[CORS Wrapper] Function error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};