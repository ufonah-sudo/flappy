const tg = window.Telegram.WebApp;

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

        // ПРОВЕРКА: Что нам прислал сервер?
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            // Если это JSON, читаем как обычно
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error || `Server error ${response.status}`);
            }
            return responseData;
        } else {
            // Если это НЕ JSON (например, HTML страница ошибки Vercel)
            const textError = await response.text();
            console.error("КРИТИЧЕСКАЯ ОШИБКА СЕРВЕРА (HTML):", textError.substring(0, 200));
            throw new Error(`Server returned HTML instead of JSON (Status: ${response.status})`);
        }
    } catch (error) {
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