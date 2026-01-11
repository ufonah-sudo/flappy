/**
 * api/auth.js - Авторизация, синхронизация состояния и рефералы
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { initData, startParam, action, coins, crystals, powerups, inventory } = req.body;

    // 1. Проверка Telegram (обязательно для любого действия в auth)
    const user = verifyTelegramData(initData);
    if (!user) {
        return res.status(403).json({ error: 'Invalid signature' });
    }

    try {
        // --- ОБРАБОТКА ACTION: GET_FRIENDS ---
        if (action === 'get_friends') {
            const { data: friends, error: friendsError } = await supabase
                .from('referrals')
                .select(`
                    referred_id,
                    users!referred_id ( username, coins )
                `)
                .eq('referrer_id', user.id);

            if (friendsError) throw friendsError;
            return res.status(200).json({ friends: friends || [] });
        }

                // --- ОБРАБОТКА ACTION: CLAIM_FRIEND (ЗАБРАТЬ НАГРАДУ) ---
        if (action === 'claim_friend') {
            const { friend_username } = req.body;
            
            // 1. Находим ID друга по юзернейму
            const { data: friendUser, error: findError } = await supabase
                .from('users')
                .select('id')
                .eq('username', friend_username)
                .single();
                
            if (findError || !friendUser) throw new Error('Friend not found');

            // 2. Обновляем статус в таблице рефералов
            const { data, error: updateError } = await supabase
                .from('referrals')
                .update({ status: 'claimed' })
                .eq('referrer_id', user.id)
                .eq('referred_id', friendUser.id)
                .eq('status', 'pending') // Обновляем только если еще не забрали
                .select();

            if (updateError) throw updateError;
            if (!data || data.length === 0) throw new Error('Reward already claimed or invalid');

            // 3. Начисляем монеты себе (5 монет)
            await supabase.rpc('increment_coins', { 
                user_id_param: user.id, 
                amount: 5 
            });

            return res.status(200).json({ success: true });
        }


        // --- ОБРАБОТКА ACTION: SYNC_STATE (СОХРАНЕНИЕ) ---
        if (action === 'sync_state') {
            const { data: updated, error: syncError } = await supabase
                .from('users')
                .update({ 
                    coins, 
                    crystals, 
                    powerups, 
                    inventory, 
                    last_sync: new Date() 
                })
                .eq('id', user.id)
                .select()
                .single();

            if (syncError) throw syncError;
            return res.status(200).json({ user: updated });
        }

        // --- ЛОГИКА АВТОРИЗАЦИИ (БЕЗ ACTION ИЛИ ACTION: GET_USER) ---
        let { data: dbUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (fetchError) throw fetchError;

              // Если игрока нет — создаем его
        if (!dbUser) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ 
                    id: user.id, 
                    username: user.username || 'Player', 
                    coins: 10,
                    powerups: {},
                    inventory: [],
                    
                    // 👇 ВОТ ЧЕГО НЕ ХВАТАЛО 👇
                    lives: 5,                  // Начальная энергия
                    crystals: 0,               // Начальные кристаллы
                    daily_step: 1,             // Начальный день Daily Streak
                    daily_claimed: false,      // Награда за вход не забрана
                    bonus_claimed: false,      // Сундук не забран
                    daily_challenges: [],      // Пустой массив заданий
                    last_daily_reset: new Date().toISOString(), // Таймер Daily
                    max_level: 1,              // Начальный уровень карьеры
                    last_energy_update: new Date().toISOString() // Таймер энергии
                    // ---------------------------
                })
                .select('*')
                .single();
            
            if (createError) throw createError;
            dbUser = newUser;

            // Логика рефералов (остается без изменений)
            if (startParam && String(startParam) !== String(user.id)) {
                const inviterId = String(startParam);
                await supabase.from('referrals').insert({ 
                    referrer_id: inviterId, 
                    referred_id: user.id 
                });
                await supabase.rpc('increment_coins', { 
                    user_id_param: inviterId, 
                    amount: 50
                });
            }
        }
        return res.status(200).json({ user: dbUser });
    } catch (err) {
        console.error("[AUTH ERROR]:", err.message);
        return res.status(500).json({ error: err.message });
    }
};


export default cors(handler);