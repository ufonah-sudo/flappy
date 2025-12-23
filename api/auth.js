import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    // Логирование входящих данных
    console.log("Body received:", req.body);

    const { initData, startParam } = req.body;

    if (!initData) {
        return res.status(400).json({ error: 'Missing initData' });
    }

    const user = verifyTelegramData(initData);

    if (!user) {
        // Если проверка не прошла, логируем детали
        console.error("Verification failed for initData:", initData);
        return res.status(403).json({ error: 'Invalid signature' });
    }

    // Ищем пользователя по 'id' (PRIMARY KEY в Supabase)
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
            
            if (!isNaN(inviterId)) {
                // Проверяем, существует ли пригласивший
                const { data: inviter } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', inviterId)
                    .maybeSingle();
                
                if (inviter) {
                    // Колонки: referrer_id, referred_id
                    const { error: refError } = await supabase
                        .from('referrals')
                        .insert({ 
                            referrer_id: inviterId, 
                            referred_id: user.id 
                        });
                    
                    if (!refError) {
                        try {
                            await supabase.rpc('increment_coins', { 
                                user_id_param: inviterId, 
                                amount: 5 // Бонус пригласившему
                            }); 
                        } catch (rpcErr) {
                            console.error("RPC increment_coins error:", rpcErr);
                        }
                    }
                }
            }
        }
    }

    // Возвращаем данные пользователя
    return res.status(200).json({ user: dbUser });
};

export default cors(handler);