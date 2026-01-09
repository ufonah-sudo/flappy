/**
 * api/daily.js - Серверная логика для Daily Hub
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

// --- БАЗА ЗАДАНИЙ (Чем больше, тем лучше) ---
const CHALLENGE_POOL = [
    { id: 'fly_100', text: 'Пролети 100 труб', target: 100, reward: 'coins_50' },
    { id: 'fly_200', text: 'Пролети 200 труб', target: 200, reward: 'energy_1' },
    { id: 'coins_100', text: 'Собери 100 монет', target: 100, reward: 'coins_75' },
    { id: 'coins_250', text: 'Собери 250 монет', target: 250, reward: 'energy_1' },
    { id: 'play_3', text: 'Сыграй 3 игры', target: 3, reward: 'coins_30' },
    { id: 'play_5_arcade', text: 'Сыграй 5 раз в Аркаде', target: 5, reward: 'energy_1' },
    { id: 'use_3_shields', text: 'Используй 3 Щита', target: 3, reward: 'powerup_shield_1' },
    { id: 'use_5_magnets', text: 'Используй 5 Магнитов', target: 5, reward: 'powerup_magnet_1' }
];

const handler = async (req, res) => {
    const { initData, action } = req.body;
    
    const user = verifyTelegramData(initData);
    if (!user) return res.status(403).json({ error: 'Auth failed' });

    try {
        const { data: dbUser, error: fetchError } = await supabase
            .from('users')
            .select('daily_step, daily_claimed, daily_challenges, last_daily_reset')
            .eq('id', user.id)
            .single();

        if (fetchError) throw fetchError;

        // --- 1. ПРОВЕРКА И ОБНОВЛЕНИЕ ДНЯ ---
        // Если прошел день с последнего обновления
        const now = new Date();
        const lastReset = new Date(dbUser.last_daily_reset || 0);
        const diffHours = (now - lastReset) / (1000 * 60 * 60);

        if (diffHours >= 24) {
            // Выбираем 3 рандомных задания
            const shuffled = CHALLENGE_POOL.sort(() => 0.5 - Math.random());
            const newChallenges = shuffled.slice(0, 3).map(ch => ({ ...ch, progress: 0 }));

            // Сбрасываем флаги
            await supabase.from('users').update({
                daily_step: (dbUser.daily_step % 5) + 1, // 1->2...5->1
                daily_claimed: false,
                bonus_claimed: false, // Флаг сундука
                daily_challenges: newChallenges,
                last_daily_reset: now.toISOString()
            }).eq('id', user.id);

            // Перезапрашиваем юзера, чтобы отдать свежие данные
            const { data: refreshedUser } = await supabase
                .from('users').select('*').eq('id', user.id).single();
            return res.status(200).json({ refreshedUser });
        }
        
        // --- 2. ВЫДАЧА НАГРАДЫ ЗА СЕРИЮ ---
        if (action === 'claim_streak') {
            if (dbUser.daily_claimed) {
                return res.status(400).json({ error: 'Already claimed' });
            }

            // Проверка, что все предыдущие дни забраны (логика на клиенте)
            await supabase.from('users').update({ daily_claimed: true }).eq('id', user.id);
            return res.status(200).json({ success: true, message: 'Streak reward claimed' });
        }

        // --- 3. ВЫДАЧА БОНУСА (СУНДУКА) ---
        if (action === 'claim_bonus_chest') {
            const allDone = dbUser.daily_challenges.every(ch => ch.progress >= ch.target);
            if (!allDone) {
                return res.status(400).json({ error: 'Complete all challenges first!' });
            }
            
            // Награждаем (например, 200 монет и 1 кристалл)
            await supabase.rpc('increment_resources', { 
                user_id_param: user.id, 
                coins_to_add: 200,
                crystals_to_add: 1
            });
            await supabase.from('users').update({ bonus_claimed: true }).eq('id', user.id);
            
            return res.status(200).json({ success: true, reward: '200 coins, 1 crystal' });
            
        }
        
        // Если действий не было, просто возвращаем текущего юзера
        return res.status(200).json({ refreshedUser: dbUser });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

export default cors(handler);
