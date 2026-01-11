/**
 * api/auth.js - Авторизация, синхронизация состояния и рефералы
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Всегда извлекаем initData и action. Остальное - по требованию.
    // startParam здесь не извлекаем, т.к. он в initData
    const { initData, action, coins, crystals, powerups, inventory } = req.body;

    // --- 1. Проверка Telegram-подписи initData ---
    const user = verifyTelegramData(initData);
    if (!user) {
        console.error("AUTH FAILED: Invalid signature for initData.");
        return res.status(403).json({ error: 'Invalid signature' });
    }
    console.log("Authenticated User ID:", user.id, "Username:", user.username);

    // --- 2. Извлекаем start_param из initData ---
    let startParam = "";
    try {
        const urlParams = new URLSearchParams(initData);
        startParam = urlParams.get('start_app_param') || urlParams.get('start_param') || ""; // Adjusted
    } catch(e) {
        console.warn("Could not parse start_param from initData:", e.message);
    }
    // --- ЛОГИРОВАНИЕ: ЧТО ИЗВЛЕКЛИ ---
    console.log("--- AUTH REQUEST ---");
    console.log("Extracted startParam:", startParam); // Теперь startParam будет тут
    console.log("Received action:", action);
    // ----------------------------------

    try {
        // --- ОБРАБОТКА ACTION: GET_FRIENDS ---
        if (action === 'get_friends') {
            const { data: friends, error: friendsError } = await supabase
                .from('referrals')
                .select(`
                    referred_id,
                    status, 
                    referred:users!referred_id ( id, username, first_name, last_name ) 
                `)
                .eq('referrer_id', user.id);
            if (friendsError) throw friendsError;
            
            // Форматируем данные, чтобы всегда был display_name
            const formattedFriends = (friends || []).map(friend => {
                const referredUser = friend.referred;
                let displayUsername = 'Неизвестный';

                if (referredUser?.username) {
                    displayUsername = referredUser.username;
                } else if (referredUser?.first_name || referredUser?.last_name) {
                    displayUsername = (referredUser.first_name || '') + ' ' + (referredUser.last_name || '');
                    displayUsername = displayUsername.trim();
                } else {
                    displayUsername = `ID: ${friend.referred_id}`;
                }
                
                return {
                    ...friend,
                    display_name: displayUsername 
                };
            });
            console.log("Fetched friends:", formattedFriends);
            return res.status(200).json({ friends: formattedFriends });
        }

        // --- ОБРАБОТКА ACTION: CLAIM_FRIEND ---
        if (action === 'claim_friend') {
            const { friend_id } = req.body; // Теперь ожидаем friend_id
            
            const { data: friendUser, error: findError } = await supabase
                .from('users')
                .select('id')
                .eq('id', friend_id) // Ищем по ID
                .single();
            if (findError || !friendUser) {
                console.error("CLAIM_FRIEND ERROR: Friend not found with ID:", friend_id);
                throw new Error('Friend not found');
            }

            const { data: updatedReferrals, error: updateError } = await supabase
                .from('referrals')
                .update({ status: 'claimed' })
                .eq('referrer_id', user.id)
                .eq('referred_id', friendUser.id)
                .eq('status', 'pending')
                .select();
            if (updateError) throw updateError;
            if (!updatedReferrals || updatedReferrals.length === 0) throw new Error('Reward already claimed or invalid status.');

            await supabase.rpc('increment_coins', { user_id_param: user.id, amount: 5 });
            console.log(`CLAIMED: 5 coins for inviting friend ID: ${friend_id}`);
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

        // --- АВТОРИЗАЦИЯ / РЕГИСТРАЦИЯ (ДЕЙСТВИЕ ПО УМОЛЧАНИЮ) ---
        let { data: dbUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        if (fetchError) {
            console.error("ERROR fetching existing user:", fetchError.message);
            throw fetchError;
        }

        if (!dbUser) {
            console.log("NEW USER: Creating new entry for ID:", user.id);
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ 
                    id: user.id, 
                    username: user.username || (user.first_name + ' ' + (user.last_name || '')).trim() || 'Player', 
                    coins: 10,
                    powerups: {},
                    inventory: [],
                    lives: 5, crystals: 0,
                    daily_step: 1, daily_claimed: false, bonus_claimed: false,
                    daily_challenges: [], last_daily_reset: new Date().toISOString(),
                    max_level: 1, last_energy_update: new Date().toISOString()
                })
                .select('*')
                .single();
            
            if (createError) {
                console.error("ERROR creating new user:", createError.message);
                throw createError;
            }
            dbUser = newUser;
            console.log("NEW USER CREATED:", dbUser);

            if (startParam && String(startParam) !== String(user.id)) {
                const inviterId = String(startParam);
                console.log("REFERRAL DETECTED! Inviter ID:", inviterId, "New Referred User ID:", user.id);
                
                try {
                    const { error: insertRefError } = await supabase.from('referrals').insert({ 
                        referrer_id: inviterId, 
                        referred_id: user.id 
                    });
                    if (insertRefError) {
                        console.error("REFERRAL INSERT FAILED:", insertRefError.message);
                    } else {
                        console.log("Referral recorded successfully.");
                        await supabase.rpc('increment_coins', { 
                            user_id_param: inviterId, 
                            amount: 50
                        });
                        console.log("Bonus for inviter granted.");
                    }
                } catch (referralProcessError) {
                    console.error("ERROR during referral processing:", referralProcessError.message);
                }
            } else {
                console.log("Referral NOT PROCESSED. Conditions not met (no startParam, or self-invite, or existing user). startParam:", startParam, "user.id:", user.id);
            }
        } else {
            console.log("EXISTING USER: User ID", user.id, "found in DB.");
            if (startParam && String(startParam) !== String(user.id)) {
                console.log("WARNING: startParam present for existing user, but referral was not recorded. User ID:", user.id, "startParam:", startParam);
            }
        }
        
        return res.status(200).json({ user: dbUser });

    } catch (err) {
        console.error("[AUTH HANDLER CATCH ALL ERROR]:", err.message, err.stack);
        return res.status(500).json({ error: err.message });
    }
};

export default cors(handler);
