const tg = window.Telegram.WebApp;

// Константа для базового URL (удобно менять при необходимости)
const API_BASE = '/api';

/**
 * Получает строку инициализации Telegram безопасно
 */
function getInitData() {
    try {
        // 1. Пробуем штатный метод
        if (tg.initData) return tg.initData;

        // 2. Фолбэк для некоторых ситуаций (например, старые версии или специфичные ссылки)
        const hash = window.location.hash.slice(1);
        if (hash) {
            const params = new URLSearchParams(hash);
            return params.get('tgWebAppData') || "";
        }
    } catch (e) {
        console.warn("⚠️ InitData warning:", e);
    }
    return "";
}

/**
 * Универсальная функция запроса к API
 */
async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    const initData = getInitData();
    const url = `${API_BASE}/${endpoint}`;

    // Лог для отладки (в продакшене можно закомментировать)
    // console.log(`[🚀 API] ${method} ${url} | Action: ${extraData.action || 'default'}`);

    // Контроллер для таймаута (10 секунд)
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

        // 1. Успешный пустой ответ (204 No Content)
        if (response.status === 204) return { success: true };

        // 2. Обработка JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const responseData = await response.json();
            
            if (!response.ok) {
                // Если сервер вернул логическую ошибку (например, { error: "No money" })
                throw new Error(responseData.error || responseData.message || `API Error ${response.status}`);
            }
            return responseData;
        } 
        
        // 3. Обработка текстовых ошибок (HTML, 500, 404 и т.д.)
        const text = await response.text();
        throw new Error(text.slice(0, 100) || `Server Error ${response.status}`);

    } catch (error) {
        clearTimeout(timeoutId);
        
        // Красивый вывод ошибок
        let errorMessage = error.message;
        if (error.name === 'AbortError') errorMessage = "Network timeout (10s)";
        
        console.error(`[❌ API Error] /${endpoint}:`, errorMessage);
        
        // Возвращаем объект ошибки, чтобы фронтенд мог показать уведомление
        return { error: true, message: errorMessage };
    }
}

// --- API МЕТОДЫ (Эндпоинты сохранены) ---

/**
 * Авторизация пользователя при входе
 */
export async function authPlayer(startParam) {
    return await apiRequest('auth', 'POST', { startParam });
}

/**
 * Получение баланса (использует action: 'get_user')
 */
export async function fetchBalance() {
    const data = await apiRequest('auth', 'POST', { action: 'get_user' }); 
    // Возвращаем 0, если данных нет, чтобы не ломать UI
    return (data && data.user && data.user.coins !== undefined) ? data.user.coins : 0;
}

/**
 * Списание монеты за возрождение
 * Эндпоинт: coins
 */
export async function spendCoin() {
    const data = await apiRequest('coins', 'POST', { action: 'spend_revive' }); 
    
    // Проверка: newBalance должен быть числом (даже 0)
    if (data && !data.error && typeof data.newBalance === 'number') {
        return data.newBalance; 
    }
    return { error: true };
}

/**
 * Покупка пакета монет
 * Эндпоинт: coins
 */
export async function buyCoins(amount) {
    return await apiRequest('coins', 'POST', { action: 'buy_coins', amount: amount });
}

/**
 * Сохранение рекорда
 * Эндпоинт: scores
 */
export async function saveScore(score) {
    return await apiRequest('scores', 'POST', { action: 'save_score', score: score });
}

/**
 * Получение таблицы лидеров
 * Эндпоинт: scores
 */
export async function getLeaderboard() {
    const data = await apiRequest('scores', 'POST', { action: 'get_leaderboard' });
    // Всегда возвращаем массив, чтобы map не ломался
    return (data && Array.isArray(data.leaderboard)) ? data.leaderboard : [];
}