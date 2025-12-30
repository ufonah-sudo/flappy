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
                    powerups: {}, // Инициализируем пустым JSON
                    inventory: []  // Инициализируем пустым массивом
                })
                .select()
                .single();
            
            if (createError) throw createError;
            dbUser = newUser;

            // Логика рефералов
            if (startParam && String(startParam) !== String(user.id)) {
                const inviterId = String(startParam); // Telegram ID часто лучше хранить как String
                
                // 1. Записываем связь
                await supabase.from('referrals').insert({ 
                    referrer_id: inviterId, 
                    referred_id: user.id 
                });

                // 2. Начисляем бонус пригласившему
                await supabase.rpc('increment_coins', { 
                    user_id_param: inviterId, 
                    amount: 50 // Дадим побольше за друга!
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