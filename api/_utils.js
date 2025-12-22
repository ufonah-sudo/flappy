const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Инициализация Supabase
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifyTelegramData(initData) {
    console.log("DEBUG: Computed Hash:", _hash);
console.log("DEBUG: Telegram Hash:", hash);
    if (!initData) return null;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    // ПРАВИЛЬНЫЙ СПОСОБ: Фильтруем hash, а не удаляем его из исходного объекта
    const dataCheckString = Array.from(urlParams.entries())
        .filter(([key]) => key !== 'hash') // Исключаем hash для проверки
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(process.env.TELEGRAM_BOT_TOKEN)
        .digest();
        
    const _hash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    if (_hash !== hash) {
        // Добавляем лог, чтобы ты видел ошибку в консоли Vercel
        console.error("Telegram Auth Error: Hash mismatch. Check your TELEGRAM_BOT_TOKEN.");
        return null;
    }
    
    try {
        return JSON.parse(urlParams.get('user'));
    } catch (e) {
        console.error("Telegram Auth Error: Failed to parse user data");
        return null;
    }
}

const cors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    return await fn(req, res);
};

module.exports = { supabase, verifyTelegramData, cors };