import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    // 1. Логирование входящего запроса (полезно для отладки в Vercel Logs)
    console.log(`[AUTH] Method: ${req.method} | User: ${req.body?.initData ? 'exists' : 'missing'}`);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { initData, startParam } = req.body;

    if (!initData) {
        return res.status(400).json({ error: 'Missing initData' });
    }

    // 2. Проверка данных Telegram через наши _utils
    const user = verifyTelegramData(initData);

    if (!user) {
        console.error("[AUTH] Invalid Telegram signature");
        return res.status(403).json({ error: 'Invalid signature' });
    }

    try {
        // 3. Ищем игрока в базе
        let { data: dbUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        // 4. Если игрока нет — создаем
        if (!dbUser) {
            console.log(`[AUTH] Registering new user: ${user.username || user.id}`);
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ 
                    id: user.id, 
                    username: user.username || 'Player', 
                    coins: 10 // Стартовый капитал
                })
                .select()
                .single();
            
            if (createError) throw createError;
            dbUser = newUser;

            // 5. Логика рефералов (только для новых игроков)
            if (startParam && String(startParam) !== String(user.id)) {
                const inviterId = parseInt(startParam);
                if (!isNaN(inviterId)) {
                    // Записываем кто кого пригласил
                    await supabase
                        .from('referrals')
                        .insert({ referrer_id: inviterId, referred_id: user.id })
                        .then(() => {
                            // Начисляем монеты пригласившему через RPC
                            return supabase.rpc('increment_coins', { 
                                user_id_param: inviterId, 
                                amount: 5 
                            });
                        })
                        .catch(e => console.warn("[AUTH] Referral bonus failed:", e.message));
                }
            }
        }

        // Возвращаем данные игрока на фронтенд
        return res.status(200).json({ user: dbUser });

    } catch (err) {
        console.error("[AUTH] Database error:", err.message);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Экспортируем, оборачивая в CORS из _utils.js
export default cors(handler);