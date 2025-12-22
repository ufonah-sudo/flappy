const tg = window.Telegram.WebApp;

// Автоматически определяем базовый URL для запросов
const BASE_URL = window.location.origin;

// Универсальный метод для запросов к нашему API на Vercel
async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    // ВАЖНО: Пытаемся взять данные из WebApp, а если там пусто — берем напрямую из URL (hash)
    // Это решает проблему "Missing initData" в старых версиях Telegram
    let initData = window.Telegram.WebApp.initData || ""; 
    
    if (!initData && window.location.hash) {
        initData = window.location.hash.substring(1);
    }

    // Отладочный лог: покажет в vConsole длину строки. Если 0 — значит данных все еще нет.
    console.log(`[API Request] ${endpoint}, initData length: ${initData.length}`);

    try {
        const response = await fetch(`${BASE_URL}/api/${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                initData: initData,
                ...extraData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Fetch error (${endpoint}):`, error);
        return { error: true, message: error.message };
    }
}

// 1. Авторизация и получение данных игрока
export async function authPlayer(startParam) {
    return await apiRequest('auth', 'POST', { startParam });
}

// 2. Получение актуального баланса
export async function fetchBalance() {
    const data = await apiRequest('auth', 'POST'); 
    return (data && data.user) ? data.user.coins : 0;
}

// 3. Трата монеты на оживление
export async function spendCoin() {
    const data = await apiRequest('coins', 'POST', { action: 'spend' });
    return (data && data.success) ? data.newBalance : null;
}

// 4. Покупка монет
export async function buyCoins(amount) {
    return await apiRequest('coins', 'POST', { action: 'buy', amount: amount });
}

// 5. Сохранение рекорда
export async function saveScore(score) {
    return await apiRequest('scores', 'POST', { score: score });
}

// 6. Получение топ-игроков
export async function getLeaderboard() {
    const data = await apiRequest('scores', 'POST', { action: 'get_leaderboard' });
    return data.leaderboard || [];
}