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

            const step = dbUser.daily_step || 1;
            let coins = 0, energy = 0, crystals = 0, shield = 0;

            // Награды (должны совпадать с frontend/daily.js)
            if (step === 1) coins = 50;
            else if (step === 2) energy = 1;
            else if (step === 3) shield = 1;
            else if (step === 4) coins = 150;
            else if (step === 5) crystals = 1;

            // Начисляем ресурсы (монеты, энергия, кристаллы)
            if (coins > 0 || energy > 0 || crystals > 0) {
                await supabase.rpc('increment_resources', {
                    user_id_param: user.id,
                    coins_to_add: coins,
                    crystals_to_add: crystals,
                    lives_to_add: energy
                });
            }

            // Начисляем щит (если выпал)
            if (shield > 0) {
                const currentPowerups = dbUser.powerups || {};
                currentPowerups['shield'] = (currentPowerups['shield'] || 0) + 1;
                await supabase.from('users').update({ powerups: currentPowerups }).eq('id', user.id);
            }

            // Ставим галочку
            await supabase.from('users').update({ daily_claimed: true }).eq('id', user.id);
            
            return res.status(200).json({ success: true, message: 'Reward claimed' });
        }


                      // --- 3. ВЫДАЧА БОНУСА (АТОМАРНАЯ ЗАЩИТА) ---
        if (action === 'claim_bonus_chest') {
            
            // 1. Пытаемся "застолбить" сундук
            // Обновляем ТОЛЬКО если bonus_claimed = false
            const { data: updatedRows, error: claimError } = await supabase
                .from('users')
                .update({ bonus_claimed: true })
                .eq('id', user.id)
                .eq('bonus_claimed', false) // <--- КЛЮЧЕВАЯ ЗАЩИТА
                .select(); // Возвращает обновленные строки

            if (claimError) throw claimError;

            // Если массив пустой — значит, кто-то уже забрал сундук (или условие не прошло)
            if (!updatedRows || updatedRows.length === 0) {
                return res.status(400).json({ error: 'Сундук уже открыт!' });
            }

            // 2. Проверяем задания (только если успешно "застолбили")
            // Мы уже пометили сундук как открытый, поэтому если задания не выполнены - надо откатить?
            // Нет, лучше проверить задания ДО обновления. Но тогда теряем атомарность.
            // Компромисс: Проверяем задания в памяти (dbUser), это безопасно, так как задания редко меняются.
            const allDone = dbUser.daily_challenges.every(ch => (ch.progress || 0) >= ch.target);
            
            if (!allDone) {
                // Откатываем флаг (возвращаем false), так как задания не сделаны
                await supabase.from('users').update({ bonus_claimed: false }).eq('id', user.id);
                return res.status(400).json({ error: 'Задания не выполнены!' });
            }
            
            // 3. Рулетка и начисление
            const rand = Math.random();
            let rewardText = "";
            let c = 0, cr = 0, l = 0;

            if (rand < 0.5) { c = 300; rewardText = "300 coins"; }
            else if (rand < 0.8) { l = 5; rewardText = "5 energy"; }
            else { cr = 2; rewardText = "2 crystals"; }

            await supabase.rpc('increment_resources', { 
                user_id_param: user.id, 
                coins_to_add: c, 
                crystals_to_add: cr, 
                lives_to_add: l 
            });
            
            return res.status(200).json({ success: true, reward: rewardText });
        }



                // --- 4. ОБНОВЛЕНИЕ ПРОГРЕССА ЗАДАНИЙ ---
        if (action === 'update_challenges') {
            const { challenges } = req.body;
            
            // Проверяем, что challenges это массив
            if (!Array.isArray(challenges)) {
                return res.status(400).json({ error: 'Invalid challenges format' });
            }

            // Обновляем поле в базе
            await supabase.from('users').update({
                daily_challenges: challenges
            }).eq('id', user.id);

            return res.status(200).json({ success: true });
        }

        
        // Если действий не было, просто возвращаем текущего юзера
        return res.status(200).json({ refreshedUser: dbUser });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

export default cors(handler);
