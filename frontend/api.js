const tg = window.Telegram.WebApp;

async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    // Получаем initData из WebApp
    let initData = window.Telegram.WebApp.initData || ""; 
    
    // Резервный метод получения данных
    if (!initData && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        initData = params.get('tgWebAppData') || window.location.hash.substring(1);
    }

    console.log(`[API Request] ${endpoint}, initData length: ${initData.length}`);

    try {
        // УБРАЛИ .js из пути, Vercel сам разрулит через vercel.json
        const response = await fetch(`/api/${endpoint}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: initData,
                ...extraData
            })
        });

        const contentType = response.headers.get("content-type");

        // Если пришел JSON — парсим
        if (contentType && contentType.includes("application/json")) {
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error || `Server error ${response.status}`);
            }
            return responseData;
        } else {
            // Если пришел HTML (ошибка 404) — выводим это четко
            const textError = await response.text();
            console.error("ОШИБКА: Сервер вернул не JSON, а страницу (возможно 404):", textError.substring(0, 100));
            throw new Error(`Endpoint /api/${endpoint} not found (Status: ${response.status})`);
        }
    } catch (error) {
        console.error(`Fetch error (${endpoint}):`, error.message);
        return { error: true, message: error.message };
    }
}

export async function authPlayer(startParam) {
    return await apiRequest('auth', 'POST', { startParam });
}

export async function fetchBalance() {
    const data = await apiRequest('auth', 'POST'); 
    return (data && data.user) ? data.user.coins : 0;
}

export async function spendCoin() {
    const data = await apiRequest('auth', 'POST', { action: 'spend' }); // Исправлено: трата обычно в auth или отдельном coins
    return (data && data.success) ? data.newBalance : (data && data.error ? {error: true} : null);
}

export async function buyCoins(amount) {
    return await apiRequest('auth', 'POST', { action: 'buy', amount: amount });
}

export async function saveScore(score) {
    return await apiRequest('auth', 'POST', { score: score }); // Используем auth как основной хаб если других файлов нет
}

export async function getLeaderboard() {
    const data = await apiRequest('auth', 'POST', { action: 'get_leaderboard' });
    return (data && data.leaderboard) ? data.leaderboard : [];
}