const { supabase, verifyTelegramWebAppData, allowCors } = require('./_utils');

const handler = async (req, res) => {
    const { initData, score } = req.body;
    
    // GET: Получить лидерборд
    if (req.method === 'GET') {
        // Топ 10
        const { data: top } = await supabase
            .from('scores')
            .select('score, users(username)')
            .order('score', { ascending: false })
            .limit(10);
            
        return res.status(200).json({ leaderboard: top });
    }

    // POST: Сохранить счет
    const user = verifyTelegramWebAppData(initData);
    if (!user) return res.status(403).json({ error: 'Auth failed' });

    // Анти-чит: простая проверка на сервере (например, нельзя набрать 100 очков за 2 секунды)
    // Здесь опустим тайминги для краткости, но добавим запись.
    
    await supabase.from('scores').insert({ telegram_id: user.id, score: parseInt(score) });

    // Проверяем реферальную награду за первую игру (если нужно)
    // ... логика проверки played_games ...

    return res.status(200).json({ success: true });
};

module.exports = allowCors(handler);