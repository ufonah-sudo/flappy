const tg = window.Telegram.WebApp;

async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    let initData = "";
    try {
        // Убираем возможные лишние символы в начале/конце
        initData = (tg.initData || "").trim();
        
        if (!initData && window.location.hash) {
            const params = new URLSearchParams(window.location.hash.substring(1));
            initData = params.get('tgWebAppData') || "";
        }
    } catch (e) {
        console.error("Error getting initData:", e);
    }

    // Лог для отладки (потом можно убрать)
    console.log(`[🚀 API] To: /api/${endpoint} | Action: ${extraData.action || 'none'}`);

    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                // Добавляем кастомный заголовок, иногда помогает избежать кэширования
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                initData: initData,
                ...extraData
            })
        });

        // Проверка на пустой ответ (204 No Content)
        if (response.status === 204) return { success: true };

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.error || `Error ${response.status}`);
            return responseData;
        } else {
            // Если сервер вернул ошибку в виде текста (например, лимит запросов)
            const text = await response.text();
            throw new Error(text || "Server returned non-JSON");
        }
    } catch (error) {
        console.error(`[❌ API Error] ${endpoint}:`, error.message);
        return { error: true, message: error.message };
    }
}

// --- ФУНКЦИИ (Проверь эндпоинты!) ---

export async function authPlayer(startParam) {
    return await apiRequest('auth', 'POST', { startParam });
}

export async function fetchBalance() {
    const data = await apiRequest('auth', 'POST', { action: 'get_user' }); 
    return (data && data.user) ? data.user.coins : 0;
}

export async function spendCoin() {
    // ВАЖНО: Эндпоинт 'coins'
    const data = await apiRequest('coins', 'POST', { action: 'spend_revive' }); 
    // Проверка через Number.isInteger, чтобы 0 монет не считался ошибкой
    if (data && Number.isInteger(data.newBalance)) return data.newBalance; 
    return { error: true };
}

export async function buyCoins(amount) {
    // ВАЖНО: Эндпоинт 'coins'
    return await apiRequest('coins', 'POST', { action: 'buy_coins', amount: amount });
}

export async function saveScore(score) {
    // ВАЖНО: Эндпоинт 'scores'
    return await apiRequest('scores', 'POST', { action: 'save_score', score: score });
}

export async function getLeaderboard() {
    // ВАЖНО: Эндпоинт 'scores'
    const data = await apiRequest('scores', 'POST', { action: 'get_leaderboard' });
    return (data && data.leaderboard) ? data.leaderboard : [];
}