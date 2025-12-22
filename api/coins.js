const { supabase, verifyTelegramWebAppData, allowCors } = require('./_utils');

const handler = async (req, res) => {
    const { initData, action, amount } = req.body; // action: 'spend' | 'buy'
    const user = verifyTelegramWebAppData(initData);
    if (!user) return res.status(403).json({ error: 'Invalid auth' });

    if (action === 'spend') {
        // Проверяем баланс
        const { data: dbUser } = await supabase.from('users').select('coins').eq('telegram_id', user.id).single();
        
        if (dbUser.coins < 1) {
            return res.status(400).json({ success: false, message: 'Not enough coins' });
        }

        // Списываем (Лучше делать через RPC функцию Postgres для атомарности, но здесь упростим)
        const { data, error } = await supabase
            .from('users')
            .update({ coins: dbUser.coins - 1 })
            .eq('telegram_id', user.id)
            .select()
            .single();
            
        return res.status(200).json({ success: true, newBalance: data.coins });
    }

    if (action === 'buy') {
        // В реальном проде здесь нужно проверять транзакцию TON через tonweb/ton-core
        // Здесь мы доверяем фронтенду (MOCK), но для прода это НЕЛЬЗЯ делать
        // Mock: 1 TON = 10 Coins
        const coinsToAdd = amount * 10; 
        
        const { data: dbUser } = await supabase.from('users').select('coins').eq('telegram_id', user.id).single();
        
        const { data } = await supabase
            .from('users')
            .update({ coins: dbUser.coins + coinsToAdd })
            .eq('telegram_id', user.id)
            .select()
            .single();

        return res.status(200).json({ success: true, newBalance: data.coins });
    }
};

module.exports = allowCors(handler);