const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Валидация initData от Telegram
function verifyTelegramWebAppData(telegramInitData) {
    const encoded = decodeURIComponent(telegramInitData);
    const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
    const arr = encoded.split('&');
    const hashIndex = arr.findIndex(str => str.startsWith('hash='));
    const hash = arr.splice(hashIndex, 1)[0].split('=')[1];
    
    // Сортируем и проверяем
    arr.sort((a, b) => a.localeCompare(b));
    const dataCheckString = arr.join('\n');
    const _hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    
    if (_hash !== hash) return null;
    
    // Парсим user data
    const userStr = arr.find(s => s.startsWith('user=')).split('user=')[1];
    return JSON.parse(userStr);
}

// CORS Wrapper
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

module.exports = { supabase, verifyTelegramWebAppData, allowCors };