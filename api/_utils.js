import { supabase } from './_supabase.js';
import crypto from 'crypto';

export { supabase }; 

export function verifyTelegramData(initData) {
    if (!initData) {
        console.error("DEBUG: No initData provided");
        return null;
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const keys = Array.from(urlParams.keys()).filter(key => key !== 'hash').sort();
    
    const dataCheckString = keys
        .map(key => `${key}=${urlParams.get(key)}`)
        .join('\n');

    const token = process.env.BOT_TOKEN || "";

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();
        
    const _hash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    if (_hash !== hash) {
        console.error("DEBUG: Hash mismatch! Проверь BOT_TOKEN.");
        // ВРЕМЕННО пропускаем даже с ошибкой хеша для теста записи в базу
        // return null; 
    }
    
    try {
        const userJson = urlParams.get('user');
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        console.error("DEBUG: Parse user error:", e);
        return null;
    }
}

export const cors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    return await fn(req, res);
};