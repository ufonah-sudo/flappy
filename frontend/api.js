const tg = window.Telegram.WebApp;

// Универсальный метод для запросов к нашему API
async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    let initData = window.Telegram.WebApp.initData || ""; 
    
    if (!initData && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        initData = params.get('tgWebAppData') || window.location.hash.substring(1);
    }

    console.log(`[API Request] ${endpoint}, initData length: ${initData.length}`);

    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: initData,
                ...extraData
            })
        });

        // Читаем тело ответа ОДИН раз
        const responseData = await response.json();

        if (!response.ok) {
            // Если сервер вернул ошибку (например, 403), берем текст ошибки из JSON
            throw new Error(responseData.error || `Server error ${response.status}`);
        }

        return responseData;
    } catch (error) {
        // Теперь здесь будет реальная причина: "Invalid signature" или "DB Error"
        console.error(`Fetch error (${endpoint}):`, error.message);
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
    return (data && data.leaderboard) ? data.leaderboard : [];
}