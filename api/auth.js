const { supabase, verifyTelegramData, cors } = require('./_utils');

const handler = async (req, res) => {
    // Добавляем логирование входящих данных (увидишь в логах Vercel)
    console.log("Body received:", req.body);

    const { initData, startParam } = req.body;

    if (!initData) {
        return res.status(400).json({ error: 'Missing initData' });
    }

    const user = verifyTelegramData(initData);

    if (!user) {
        // Если проверка не прошла, мы теперь увидим это в логах более детально
        console.error("Verification failed for initData:", initData);
        return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // ... остальной код (поиск и создание юзера) ...

    // Ищем пользователя. Используем 'id', так как в SQL мы сделали его PRIMARY KEY
    let { data: dbUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (fetchError) {
        console.error("Supabase Fetch Error:", fetchError);
        return res.status(500).json({ error: 'DB Fetch Error' });
    }

    // Если пользователя нет — создаем
    if (!dbUser) {
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({ 
                id: user.id, 
                username: user.username || 'Player', 
                coins: 10 // Даем 10 монет при регистрации
            })
            .select()
            .single();
        
        if (createError) {
            console.error("User Creation Error:", createError);
            return res.status(500).json({ error: 'Failed to create user' });
        }
        
        dbUser = newUser;

        // Логика рефералов
        if (startParam && String(startParam) !== String(user.id)) {
            const inviterId = parseInt(startParam);
            
            // Проверяем, существует ли пригласивший
            const { data: inviter } = await supabase
                .from('users')
                .select('id')
                .eq('id', inviterId)
                .maybeSingle();
            
            if (inviter) {
                // ВАЖНО: Названия колонок должны совпадать с SQL (referrer_id, referred_id)
                const { error: refError } = await supabase
                    .from('referrals')
                    .insert({ 
                        referrer_id: inviterId, 
                        referred_id: user.id 
                    });
                
                if (!refError) {
                    // Вызываем RPC функцию. Параметр должен называться user_id_param (как в SQL)
                    await supabase.rpc('increment_coins', { 
                        user_id_param: inviterId, 
                        amount: 5 // Бонус пригласившему
                    }); 
                }
            }
        }
    }

    return res.status(200).json({ user: dbUser });
};

module.exports = cors(handler);