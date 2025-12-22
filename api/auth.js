const { supabase, verifyTelegramWebAppData, allowCors } = require('./_utils');

const handler = async (req, res) => {
    const { initData, startParam } = req.body;
    const user = verifyTelegramWebAppData(initData);

    if (!user) return res.status(403).json({ error: 'Invalid signature' });

    // Проверяем, существует ли пользователь
    let { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();

    if (!dbUser) {
        // Регистрация нового
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({ telegram_id: user.id, username: user.username, coins: 1 }) // 1 бесплатный коин
            .select()
            .single();
        
        dbUser = newUser;

        // Обработка рефералки
        if (startParam && startParam != user.id) {
            const inviterId = parseInt(startParam);
            // Проверяем, есть ли инвайтер
            const { data: inviter } = await supabase.from('users').select('*').eq('telegram_id', inviterId).single();
            
            if (inviter) {
                // Записываем связь
                const { error: refError } = await supabase.from('referrals').insert({ inviter_id: inviterId, invited_id: user.id });
                
                if (!refError) {
                    // Награда инвайтеру (+2)
                    await supabase.rpc('increment_coins', { user_id: inviterId, amount: 2 }); 
                    // Награда приглашенному за вход (+1 уже дали при регистрации, можно добавить логику здесь если нужно)
                }
            }
        }
    }

    // Возвращаем данные пользователя
    res.status(200).json({ user: dbUser });
};

module.exports = allowCors(handler);