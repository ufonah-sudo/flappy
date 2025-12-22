const { supabase, verifyTelegramData, cors } = require('./_utils');

const handler = async (req, res) => {
    const { initData, action, amount } = req.body;
    // Используем имя из _utils.js
    const user = verifyTelegramData(initData);
    if (!user) return res.status(403).json({ error: 'Invalid auth' });

    try {
        if (action === 'spend') {
            // Рекомендую заменить этот блок на RPC для реального проекта
            const { data: dbUser, error: fetchError } = await supabase
                .from('users')
                .select('coins')
                .eq('telegram_id', user.id)
                .single();
            
            if (fetchError || !dbUser) throw new Error('User not found');
            if (dbUser.coins < 1) return res.status(400).json({ success: false, message: 'Not enough coins' });

            const { data, error } = await supabase
                .from('users')
                .update({ coins: dbUser.coins - 1 })
                .eq('telegram_id', user.id)
                .select()
                .single();
                
            return res.status(200).json({ success: true, newBalance: data.coins });
        }

        if (action === 'buy') {
            // В будущем: здесь будет проверка TON транзакции
            const coinsToAdd = (parseInt(amount) || 0) * 10; 
            
            // Используем RPC функцию для безопасного сложения на стороне сервера
            const { data, error } = await supabase
                .rpc('increment_coins', { user_id: user.id, amount: coinsToAdd });
            
            // Если RPC не настроен, оставляем твой метод обновления, но через .rpc надежнее
            const { data: updatedUser } = await supabase
                .from('users')
                .select('coins')
                .eq('telegram_id', user.id)
                .single();

            return res.status(200).json({ success: true, newBalance: updatedUser.coins });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

module.exports = cors(handler);