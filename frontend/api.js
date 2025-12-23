const tg = window.Telegram.WebApp;

// Универсальный метод для запросов к нашему API
async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    // ВАЖНО: Пытаемся взять данные из WebApp, а если там пусто — берем напрямую из URL (hash)
    let initData = window.Telegram.WebApp.initData || ""; 
    
    if (!initData && window.location.hash) {
        // Убираем решетку и ищем параметры initData в hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        if (params.has('tgWebAppData')) {
            initData = params.get('tgWebAppData');
        } else {
            initData = hash; // запасной вариант
        }
    }

    console.log(`[API Request] ${endpoint}, initData length: ${initData.length}`);

    try {
        // ИСПРАВЛЕНИЕ: Используем относительный путь '/api/...' вместо полного URL
        // Это помогает избежать проблем с CORS и протоколами (http/https)
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

        // Если сервер ответил ошибкой (400, 403, 500)
        if (!response.ok) {
            let errorDetail = "Unknown error";
            try {
                const errorJson = await response.json();
                errorDetail = errorJson.error || JSON.stringify(errorJson);
            } catch (e) {
                errorDetail = await response.text();
            }
            throw new Error(`Server ${response.status}: ${errorDetail}`);
        }

        return await response.json();
    } catch (error) {
        // Теперь мы увидим реальный текст ошибки в консоли
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