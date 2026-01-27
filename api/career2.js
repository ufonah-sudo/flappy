import { createClient } from '@supabase/supabase-js';

// Прямая инициализация для гарантии работы
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Заголовки CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, initData, level } = req.body;

  // --- БЛОК АВТОРИЗАЦИИ ---
  let userId;
  try {
    if (!initData) throw new Error("No initData provided");

    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get('user');
    
    if (userJson) {
      const telegramUser = JSON.parse(userJson);
      userId = telegramUser?.id;
    } else {
      // Поддержка JSON-объекта
      const parsed = typeof initData === 'string' ? JSON.parse(initData) : initData;
      userId = parsed?.user?.id || parsed?.id;
    }
  } catch (e) {
    console.error("Auth error:", e.message);
    return res.status(401).json({ error: 'Auth failed', details: e.message });
  }

  if (!userId) return res.status(401).json({ error: 'Invalid User ID' });

  // --- ОСНОВНАЯ ЛОГИКА ---
  try {
    // 1. СТАРТ УРОВНЯ (Списание жизни)
    if (action === 'start_level') {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('lives')
        .eq('id', userId)
        .single();

      if (fetchError || !user) return res.status(404).json({ error: 'User not found' });
      if (user.lives < 1) return res.status(400).json({ error: 'Недостаточно энергии' });

      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ lives: user.lives - 1 })
        .eq('id', userId)
        .select('lives')
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({ success: true, lives: updated.lives });
    }

    // 2. ЗАВЕРШЕНИЕ УРОВНЯ (Начисление монет и прогресса)
    else if (action === 'complete_level') {
      if (!level) return res.status(400).json({ error: 'Level ID missing' });
      const levelId = parseInt(level);

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('max_level, coins')
        .eq('id', userId)
        .single();

      if (userError || !user) throw new Error('User not found in DB');

      const newMaxLevel = Math.max(user.max_level, levelId + 1);
      const rewardCoins = 10; 

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
    console.error('API Error:', err.message);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}