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
    
    const dataCheckString = Array.from(urlParams.entries())
        .filter(([key]) => key !== 'hash')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    // ИСПРАВЛЕНО: Теперь берем BOT_TOKEN, как в твоем Vercel
    const token = process.env.BOT_TOKEN || "";

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();
        
    const _hash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    if (_hash !== hash) {
        console.error("DEBUG: Hash mismatch!");
        return null; 
    }
    
    try {
        return JSON.parse(urlParams.get('user'));
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