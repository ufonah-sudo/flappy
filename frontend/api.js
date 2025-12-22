const tg = window.Telegram.WebApp;

// Универсальный метод для запросов к нашему API на Vercel
async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    const initData = tg.initData; // Берем подпись Telegram

    try {
        const response = await fetch(`/api/${endpoint}`, {
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
            throw new Error(`API Error: ${response.status}`);
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

// 2. Получение актуального баланса (если нужно отдельно)
export async function fetchBalance() {
    // В нашей структуре баланс возвращается при auth, 
    // но можно сделать отдельный запрос в coins.js если нужно
    const data = await apiRequest('auth', 'POST'); 
    return data.user ? data.user.coins : 0;
}

// 3. Трата монеты на оживление
export async function spendCoin() {
    const data = await apiRequest('coins', 'POST', { action: 'spend' });
    return data.success ? data.newBalance : null;
}

// 4. Покупка монет (уведомление сервера после транзакции TON)
export async function buyCoins(amount) {
    return await apiRequest('coins', 'POST', { action: 'buy', amount: amount });
}

// 5. Сохранение рекорда
export async function saveScore(score) {
    return await apiRequest('scores', 'POST', { score: score });
}

// 6. Получение топ-игроков
export async function getLeaderboard() {
    // Лидерборд - единственный GET запрос, не требующий подписи
    try {
        const response = await fetch('/api/scores');
        const data = await response.json();
        return data.leaderboard || [];
    } catch (e) {
        return [];
    }
}