/**
 * api.js - Модуль для взаимодействия с бэкендом (сервером)
 */
const tg = window.Telegram?.WebApp;
const API_BASE = '/api';

/**
 * Функция для извлечения данных авторизации Telegram
 * (Используется как fallback, если initData не передан явно)
 */
function getInitData() {
    try {
        if (tg && tg.initData) return tg.initData;
        const hash = window.location.hash.slice(1);
        if (hash) {
            const params = new URLSearchParams(hash);
            return params.get('tgWebAppData') || "";
        }
    } catch (e) {
        console.warn("⚠️ [API] InitData check failed in getInitData():", e);
    }
    return "";
}

/**
 * Универсальное ядро для выполнения сетевых запросов fetch
 */
export async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    // --- ИСПРАВЛЕНИЕ: ПРИОРИТЕТ initData ---
    // 1. Пытаемся взять initData из extraData (если authPlayer его передал)
    // 2. Если нет, берем из getInitData()
    const finalInitData = extraData.initData || getInitData(); 

    // Удаляем initData из extraData, чтобы не дублировать его в body
    const cleanExtraData = { ...extraData };
    delete cleanExtraData.initData; 
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const url = `${API_BASE}/${endpoint}`;
    
    // Логируем, что отправляем
    console.log(`[🚀 API REQUEST] ${url}`, { ...cleanExtraData, initDataStatus: finalInitData ? "PRESENT" : "MISSING" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                initData: finalInitData, // <--- ИСПОЛЬЗУЕМ КОРРЕКТНЫЙ initData
                ...cleanExtraData        // <--- ОСТАЛЬНЫЕ ПАРАМЕТРЫ
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

// --- СЕКЦИЯ: ПРОФИЛЬ И СОСТОЯНИЕ ---

/**
 * Авторизация или регистрация игрока при входе
 * initDataString - это tg.initData, который main.js передает
 */
export async function authPlayer(startParam, initDataString) {
    return await apiRequest('auth', 'POST', { 
        startParam, 
        initData: initDataString // <-- Передаем initData как часть extraData
    });
}

/**
 * Метод для получения текущего количества монет (deprecated, use authPlayer)
 */
export async function fetchBalance() {
    // Запрашиваем данные пользователя через действие get_user
    // initData здесь возьмется из getInitData()
    const data = await apiRequest('auth', 'POST', { action: 'get_user' }); 
    if (data.error || !data.user) return 0;
    return typeof data.user.coins === 'number' ? data.user.coins : 0;
}

/**
 * Полная синхронизация состояния игры с базой данных
 */
export async function syncState(stateData) { // Переименовал state, чтобы не конфликтовать с window.state
    return await apiRequest('auth', 'POST', { 
        action: 'sync_state', 
        coins: stateData.coins,
        crystals: stateData.crystals,
        powerups: stateData.powerups,
        inventory: stateData.inventory || []
    });
}

export const updateUserData = syncState;

// --- СЕКЦИЯ: ЭКОНОМИКА (МОНЕТЫ И МАГАЗИН) ---

export async function buyCoins(amount) {
    return await apiRequest('coins', 'POST', { action: 'buy_coins', amount: amount });
}

export async function buyItem(itemType) {
    return await apiRequest('coins', 'POST', { action: 'buy_item', item: itemType });
}

export async function spendCoin() {
    const data = await apiRequest('coins', 'POST', { action: 'spend_revive' }); 
    if (data && !data.error && typeof data.newBalance === 'number') {
        return data.newBalance; 
    }
    return { error: true };
}

// --- СЕКЦИЯ: РЕКОРДЫ И СОЦИАЛКА ---

export async function saveScore(score) {
    if (score < 0) return { error: true };
    return await apiRequest('scores', 'POST', { action: 'save_score', score: score });
}

export async function getLeaderboard() {
    const data = await apiRequest('scores', 'POST', { action: 'get_leaderboard' });
    return (data && Array.isArray(data.leaderboard)) ? data.leaderboard : [];
}

export async function getFriends() {
    const data = await apiRequest('auth', 'POST', { action: 'get_friends' });
    return (data && Array.isArray(data.friends)) ? data.friends : [];
}

export async function claimFriendReward(friendUsername) {
    return await apiRequest('auth', 'POST', { 
        action: 'claim_friend', 
        friend_username: friendUsername 
    });
}
