const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifyTelegramData(initData) {
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

    // Проверяем, видит ли сервер вообще токен (выведет первые 5 символов)
    const token = process.env.TELEGRAM_BOT_TOKEN || "";
    console.log("DEBUG: Token starts with:", token.substring(0, 5));

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();
        
    const _hash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // Теперь логи сработают, так как переменные уже созданы
    console.log("DEBUG: Computed Hash:", _hash);
    console.log("DEBUG: Telegram Hash:", hash);

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

const cors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    return await fn(req, res);
};

module.exports = { supabase, verifyTelegramData, cors };