/**
 * api/auth.js - Авторизация, синхронизация состояния и рефералы
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { initData, action, coins, crystals, powerups, inventory } = req.body;

    // --- 1. Проверка Telegram-подписи ---
    const user = verifyTelegramData(initData);
    if (!user) {
        console.error("AUTH FAILED: Invalid signature for initData.");
        return res.status(403).json({ error: 'Invalid signature' });
    }

    // --- 2. Извлекаем start_param ---
    let startParam = "";
    try {
        const urlParams = new URLSearchParams(initData);
        startParam = urlParams.get('start_app_param') || urlParams.get('start_param') || "";
    } catch(e) {
        console.warn("Could not parse start_param from initData:", e.message);
    }

    try {
        // --- ОБРАБОТКА ACTION: GET_FRIENDS ---
        if (action === 'get_friends') {
            const { data: friends, error: friendsError } = await supabase
                .from('referrals')
                .select(`
                    referred_id,
                    status, 
                    referred:users!referred_id ( username )
                `)
                .eq('referrer_id', user.id);
            if (friendsError) throw friendsError;
            return res.status(200).json({ friends: friends || [] });
        }

        // --- ОБРАБОТКА ACTION: CLAIM_FRIEND ---
        if (action === 'claim_friend') {
            const { friend_id } = req.body;
            
            // Проверяем существование друга
            const { data: friendUser, error: findError } = await supabase
                .from('users')
                .select('id, username')
                .eq('id', friend_id)
                .single();

            if (findError || !friendUser) {
                return res.status(404).json({ error: 'Friend not found' });
            }

            // Обновляем статус реферала
            const { data: updatedReferrals, error: updateError } = await supabase
                .from('referrals')
                .update({ status: 'claimed' })
                .eq('referrer_id', user.id)
                .eq('referred_id', friendUser.id)
                .eq('status', 'pending')
                .select();

            if (updateError) throw updateError;
            if (!updatedReferrals || updatedReferrals.length === 0) {
                return res.status(400).json({ error: 'Reward already claimed or invalid status.' });
            }

            // Начисляем монеты
            await supabase.rpc('increment_coins', { user_id_param: user.id, amount: 5 });
            return res.status(200).json({ success: true });
        }

        // --- ОБРАБОТКА ACTION: SYNC_STATE ---
        if (action === 'sync_state') {
            const { data: updated, error: syncError } = await supabase
                .from('users')
                .update({ coins, crystals, powerups, inventory, last_sync: new Date() })
                .eq('id', user.id)
                .select()
                .single();
            if (syncError) throw syncError;
            return res.status(200).json({ user: updated });
        }

                // --- ОБРАБОТКА ACTION: UPDATE_WALLET_INFO (НОВОЕ) ---
        if (action === 'update_wallet_info') {
            const { wallet_address } = req.body;

            await supabase
                .from('users')
                .update({ wallet_address: wallet_address }) // Сохраняем адрес
                .eq('id', user.id);
            
            console.log(`User ${user.id} wallet updated to: ${wallet_address}`);
            return res.status(200).json({ success: true });
        }


        // --- АВТОРИЗАЦИЯ / РЕГИСТРАЦИЯ ---
        let { data: dbUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!dbUser) {
            const username = user.username || (user.first_name + ' ' + (user.last_name || '')).trim() || 'Player';
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ 
                    id: user.id, 
                    username: username,
                    coins: 10,
                    powerups: {},
                    inventory: [],
                    lives: 5, 
                    crystals: 0,
                    daily_step: 1, 
                    daily_claimed: false, 
                    bonus_claimed: false,
                    daily_challenges: [], 
                    last_daily_reset: new Date().toISOString(),
                    max_level: 1, 
                    last_energy_update: new Date().toISOString()
                })
                .select('*')
                .single();
            
            if (createError) throw createError;
            dbUser = newUser;

            // Логика рефералов для новичка
            if (startParam && String(startParam) !== String(user.id)) {
                const inviterId = String(startParam);
                
                const { error: insertRefError } = await supabase.from('referrals').insert({ 
                    referrer_id: inviterId, 
                    referred_id: user.id 
                });

                if (!insertRefError) {
                    await supabase.rpc('increment_coins', { 
                        user_id_param: inviterId, 
                        amount: 50
                    });
                }
            }
        }
        
        return res.status(200).json({ user: dbUser });

    } catch (err) {
        console.error("[AUTH HANDLER ERROR]:", err.message);
        return res.status(500).json({ error: err.message });
    }
};

export default cors(handler);