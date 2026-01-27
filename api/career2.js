import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase (убедись, что переменные окружения настроены в Vercel/хостинге)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Разрешаем CORS (чтобы Telegram WebApp не ругался)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, initData, level } = req.body;

  // 1. Простейшая валидация (в реальном продакшене тут нужна проверка initData от Telegram)
  if (!initData) {
    return res.status(401).json({ error: 'No auth data' });
  }

  // Парсим данные пользователя из строки Telegram (для получения username/id)
 const urlParams = new URLSearchParams(initData);
  const userJson = urlParams.get('user');
  
  // Проверяем, удалось ли достать пользователя
  if (!userJson) return res.status(401).json({ error: 'User data missing' });
  
  const telegramUser = JSON.parse(userJson);
  const userId = telegramUser?.id;

  if (!userId) return res.status(401).json({ error: 'Invalid User ID' });

  try {
    // --- ДЕЙСТВИЕ: ЗАПУСК УРОВНЯ (START_LEVEL) ---
    if (action === 'start_level') {
      // 1. Получаем текущие жизни
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('lives')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // 2. Проверяем, есть ли энергия
      if (user.lives < 1) {
        return res.status(400).json({ error: 'Недостаточно энергии' });
      }

      // 3. Списываем 1 жизнь
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ lives: user.lives - 1 })
        .eq('id', userId)
        .select('lives')
        .single();

      if (updateError) throw updateError;

      // Возвращаем успех и новый баланс жизней
      return res.status(200).json({ 
        success: true, 
        lives: updatedUser.lives 
      });
    }

    // --- ДЕЙСТВИЕ: ЗАВЕРШЕНИЕ УРОВНЯ (COMPLETE_LEVEL) ---
  else if (action === 'complete_level') {
      if (!level) return res.status(400).json({ error: 'Level ID missing' }); // Добавлено
      const levelId = parseInt(level);

      // 1. Получаем текущий прогресс
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('max_level, coins')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found in DB' });
      }

      // 2. Рассчитываем следующий уровень
      // Если прошли 5-й уровень, то макс. становится 6.
      // Но если у игрока уже открыт 10-й, то не откатываем назад.
      const newMaxLevel = Math.max(user.max_level, levelId + 1);

      // 3. Начисляем монеты за победу (например, 10 монет)
      const rewardCoins = 10; 

      // 4. Обновляем базу
      const { error: saveError } = await supabase
        .from('users')
        .update({ 
          max_level: newMaxLevel,
          coins: user.coins + rewardCoins
        })
        .eq('id', userId);

      if (saveError) throw saveError;

      return res.status(200).json({ 
        success: true, 
        new_max_level: newMaxLevel,
        reward: rewardCoins
      });
    }

    else {
      return res.status(400).json({ error: 'Unknown action' });
    }

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}