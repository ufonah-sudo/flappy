/**
 * api.js - Модуль для взаимодействия с бэкендом (сервером)
 */

// Используем опциональную цепочку, чтобы не "уронить" движок вне Telegram
const tg = window.Telegram?.WebApp;

// Базовый URL для всех API запросов
const API_BASE = '/api';

/**
 * Получение данных инициализации Telegram (initData) для авторизации
 */
function getInitData() {
    try {
        // Если WebApp запущен внутри Telegram, берем данные из SDK
        if (tg && tg.initData) return tg.initData;
        // Если мы в браузере, пробуем достать данные из hash ссылки
        const hash = window.location.hash.slice(1);
        if (hash) {
            const params = new URLSearchParams(hash);
            return params.get('tgWebAppData') || "";
        }
    } catch (e) {
        // Вывод предупреждения, если не удалось получить данные
        console.warn("⚠️ [API] InitData check failed:", e);
    }
    // Возвращаем пустую строку, если данных нет
    return "";
}

/**
 * Универсальный метод для выполнения всех HTTP-запросов к серверу
 */
export async function apiRequest(endpoint, method = 'POST', extraData = {}) {
    const initData = getInitData(); // Получаем данные пользователя для валидации сервером
    const url = `${API_BASE}/${endpoint}`; // Собираем полный путь к эндпоинту

    // Логирование запроса в консоль для отладки процесса
    console.log(`[🚀 API REQUEST] ${url}`, extraData);

    // Установка тайм-аута: если сервер не ответит за 10 секунд, запрос отменится
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        // Выполняем сетевой запрос через fetch
        const response = await fetch(url, {
            method: method, // Метод (обычно POST)
            headers: { 
                'Content-Type': 'application/json', // Работаем с JSON
                'Cache-Control': 'no-cache, no-store, must-revalidate', // Запрет кэширования
                'Pragma': 'no-cache' // Запрет кэширования для старых браузеров
            },
            body: JSON.stringify({
                initData: initData, // Обязательно передаем данные авторизации
                ...extraData // Добавляем остальные данные (экшены, суммы и т.д.)
            }),
            signal: controller.signal // Привязываем сигнал отмены по тайм-ауту
        });

        clearTimeout(timeoutId); // Если запрос прошел, сбрасываем таймер ожидания

        // Если сервер вернул 204 (No Content), возвращаем успех
        if (response.status === 204) return { success: true };

        const contentType = response.headers.get("content-type");
        // Проверяем, что сервер вернул именно JSON
        if (contentType && contentType.includes("application/json")) {
            const responseData = await response.json(); // Парсим JSON ответ
            
            // Если статус ответа не в диапазоне 200-299, выбрасываем ошибку
            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || `Status: ${response.status}`);
            }
            return responseData; // Возвращаем полученные данные
        } 
        
        // Если ответ не JSON, читаем его как текст для логирования ошибки
        const text = await response.text();
        throw new Error(text.slice(0, 100) || `Server Error ${response.status}`);

    } catch (error) {
        clearTimeout(timeoutId); // Сброс таймера при ошибке
        // Логирование ошибки запроса
        console.error(`[❌ API ERROR] /${endpoint}:`, error.message);
        return { error: true, message: error.message }; // Возвращаем объект ошибки
    }
}

// --- МЕТОДЫ АВТОРИЗАЦИИ И СОСТОЯНИЯ ---

/**
 * Авторизация игрока при старте приложения
 */
export async function authPlayer(startParam) {
    // Отправляем запрос на авторизацию с возможным реферальным параметром
    return await apiRequest('auth', 'POST', { startParam });
}

/**
 * Получение актуального баланса игрока
 */
export async function fetchBalance() {
    // Запрашиваем данные пользователя через экшен get_user
    const data = await apiRequest('auth', 'POST', { action: 'get_user' }); 
    if (data.error) return null; // Если ошибка - возвращаем null
    // Проверяем наличие поля монет и возвращаем его, либо 0
    return (data && data.user && typeof data.user.coins === 'number') ? data.user.coins : 0;
}

/**
 * Глобальное сохранение состояния (монеты, кристаллы, способности) на сервер
 */
export async function syncState(state) {
    // Отправляем все важные данные игрока для записи в базу данных
    return await apiRequest('auth', 'POST', { 
        action: 'sync_state', 
        coins: state.coins, 
        crystals: state.crystals, 
        powerups: state.powerups 
    });
}

// --- МЕТОДЫ МОНЕТ И МАГАЗИНА ---

/**
 * Покупка монет (обычно вызывается после подтверждения платежа в TON)
 */
export async function buyCoins(amount) {
    // Сообщаем серверу о покупке определенного количества монет
    return await apiRequest('coins', 'POST', { action: 'buy_coins', amount: amount });
}

/**
 * Покупка игрового предмета (способности) за игровые монеты
 */
export async function buyItem(itemType) {
    // Запрос на сервер для списания монет и добавления предмета в базу
    return await apiRequest('coins', 'POST', { 
        action: 'buy_item', 
        item: itemType 
    });
}

/**
 * Расход монет на возрождение (если нет сердец)
 */
export async function spendCoin() {
    // Отправляем запрос на списание монет за услугу "ревайва"
    const data = await apiRequest('coins', 'POST', { action: 'spend_revive' }); 
    // Если ответ корректный, возвращаем новый баланс
    if (data && !data.error && typeof data.newBalance === 'number') {
        return data.newBalance; 
    }
    return { error: true }; // Возвращаем ошибку при неудаче
}

// --- МЕТОДЫ СЧЕТА И ЛИДЕРБОРДА ---

/**
 * Сохранение рекорда очков на сервер
 */
export async function saveScore(score) {
    // Отправляем результат игры для обновления таблицы лидеров
    return await apiRequest('scores', 'POST', { action: 'save_score', score: score });
}

/**
 * Получение списка лучших игроков
 */
export async function getLeaderboard() {
    // Запрашиваем топ игроков у сервера
    const data = await apiRequest('scores', 'POST', { action: 'get_leaderboard' });
    // Возвращаем массив лидерборда или пустой массив, если данных нет
    return (data && Array.isArray(data.leaderboard)) ? data.leaderboard : [];
}

// --- МЕТОДЫ ДРУЗЕЙ ---

/**
 * Получение списка друзей пользователя
 */
export async function getFriends() {
    // Отправляем запрос на получение данных о приглашенных друзьях
    return await apiRequest('auth', 'POST', { action: 'get_friends' });
}