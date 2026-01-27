/**
 * api/career2.js - Интегрированная логика карьеры
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    // 1. Проверка метода
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action, initData, level } = req.body;

    // 2. Валидация пользователя (используем твой основной механизм)
    const user = verifyTelegramData(initData);
    if (!user) {
        console.error("[CAREER AUTH] Failed to verify Telegram data");
        return res.status(403).json({ error: 'Invalid auth' });
    }

    try {
        // --- ДЕЙСТВИЕ: START_LEVEL (Списание энергии) ---
        if (action === 'start_level') {
            const { data: dbUser, error: fetchErr } = await supabase
                .from('users')
                .select('lives')
                .eq('id', user.id)
                .single();

            if (fetchErr || !dbUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (dbUser.lives < 1) {
                return res.status(400).json({ error: 'Недостаточно энергии ⚡' });
            }

            // Атомарное списание через обновление
            const { data: updated, error: updateErr } = await supabase
                .from('users')
                .update({ lives: dbUser.lives - 1 })
                .eq('id', user.id)
                .select('lives')
                .single();

            if (updateErr) throw updateErr;

            return res.status(200).json({ success: true, lives: updated.lives });
        }

        // --- ДЕЙСТВИЕ: COMPLETE_LEVEL (Награда и прогресс) ---
        if (action === 'complete_level') {
            const levelId = parseInt(level);
            if (isNaN(levelId)) return res.status(400).json({ error: 'Invalid level ID' });

            const { data: dbUser, error: userErr } = await supabase
                .from('users')
                .select('max_level, coins')
                .eq('id', user.id)
                .single();

            if (userErr || !dbUser) throw new Error('User fetch error');

            // Обновляем макс. уровень, если текущий пройденный больше или равен макс.
            const newMaxLevel = Math.max(dbUser.max_level, levelId + 1);
            const REWARD = 10;

            const { error: saveErr } = await supabase
                .from('users')
                .update({ 
                    max_level: newMaxLevel,
                    coins: (dbUser.coins || 0) + REWARD,
                    last_sync: new Date().toISOString()
                })
                .eq('id', user.id);

            if (saveErr) throw saveErr;

            return res.status(200).json({ 
                success: true, 
                new_max_level: newMaxLevel,
                reward: REWARD 
            });
        }

        return res.status(400).json({ error: 'Unknown career action' });

    } catch (e) {
        console.error("[CAREER API ERROR]:", e.message);
        return res.status(500).json({ error: e.message });
    }
};

// Обязательно оборачиваем в твой CORS
export default cors(handler);