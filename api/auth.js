const { supabase, verifyTelegramData, cors } = require('./_utils');

const handler = async (req, res) => {
    const { initData, startParam } = req.body;
    // Используем имя функции из твоего _utils.js
    const user = verifyTelegramData(initData);

    if (!user) return res.status(403).json({ error: 'Invalid signature' });

    let { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).maybeSingle();

    if (!dbUser) {
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({ telegram_id: user.id, username: user.username || 'Player', coins: 1 })
            .select()
            .single();
        
        if (createError) return res.status(500).json({ error: 'Failed to create user' });
        dbUser = newUser;

        if (startParam && String(startParam) !== String(user.id)) {
            const inviterId = parseInt(startParam);
            const { data: inviter } = await supabase.from('users').select('telegram_id').eq('telegram_id', inviterId).maybeSingle();
            
            if (inviter) {
                const { error: refError } = await supabase.from('referrals').insert({ inviter_id: inviterId, invited_id: user.id });
                
                if (!refError) {
                    // Убедись, что функция increment_coins создана в Supabase SQL
                    await supabase.rpc('increment_coins', { user_id: inviterId, amount: 2 }); 
                }
            }
        }
    }

    res.status(200).json({ user: dbUser });
};

module.exports = cors(handler);