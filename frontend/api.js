// Используем опциональную цепочку, чтобы не "уронить" движок вне Telegram
const tg = window.Telegram?.WebApp;

const API_BASE = '/api';

function getInitData() {
    try {
        if (tg && tg.initData) return tg.initData;
        const hash = window.location.hash.slice(1);
        if (hash) {
            const params = new URLSearchParams(hash);
            return params.get('tgWebAppData') || "";
        }
    } catch (e) {
        console.warn("⚠️ [API] InitData check failed:", e);
    }
    return "";
}

/**
 * Универсальный метод запроса (Экспортирован!)
 */
export async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    const initData = getInitData();
    const url = `${API_BASE}/${endpoint}`;

    // Логирование важно для отладки на Vercel
    console.log(`[🚀 API REQUEST] ${url}`, extraData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            },
            body: JSON.stringify({
                initData: initData,
                ...extraData
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 204) return { success: true };

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || `Status: ${response.status}`);
            }
            return responseData;
        } 
        
        const text = await response.text();
        throw new Error(text.slice(0, 100) || `Server Error ${response.status}`);

    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[❌ API ERROR] /${endpoint}:`, error.message);
        return { error: true, message: error.message };
    }
}

// --- МЕТОДЫ ---

export async function authPlayer(startParam) {
    return await apiRequest('auth', 'POST', { startParam });
}

export async function fetchBalance() {
    const data = await apiRequest('auth', 'POST', { action: 'get_user' }); 
    // Если пришла ошибка от apiRequest, возвращаем null, чтобы отличить от 0 монет
    if (data.error) return null;
    return (data && data.user && typeof data.user.coins === 'number') ? data.user.coins : 0;
}

export async function spendCoin() {
    const data = await apiRequest('coins', 'POST', { action: 'spend_revive' }); 
    if (data && !data.error && typeof data.newBalance === 'number') {
        return data.newBalance; 
    }
    return { error: true };
}

export async function buyCoins(amount) {
    return await apiRequest('coins', 'POST', { action: 'buy_coins', amount: amount });
}

export async function saveScore(score) {
    return await apiRequest('scores', 'POST', { action: 'save_score', score: score });
}

export async function getLeaderboard() {
    const data = await apiRequest('scores', 'POST', { action: 'get_leaderboard' });
    return (data && Array.isArray(data.leaderboard)) ? data.leaderboard : [];
}