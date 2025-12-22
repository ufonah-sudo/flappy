const { supabase, verifyTelegramData, cors } = require('./_utils');

const handler = async (req, res) => {
    // GET: Лидерборд доступен всем без проверки подписи
    if (req.method === 'GET') {
        const { data: top, error } = await supabase
            .from('scores')
            .select(`
                score,
                users ( username )
            `)
            .order('score', { ascending: false })
            .limit(10);
            
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ leaderboard: top });
    }

    // POST: Сохранение требует авторизации
    if (req.method === 'POST') {
        const { initData, score } = req.body;
        const user = verifyTelegramData(initData);
        if (!user) return res.status(403).json({ error: 'Auth failed' });

        const finalScore = parseInt(score);
        if (isNaN(finalScore) || finalScore < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        // Вставляем результат
        const { error: insertError } = await supabase
            .from('scores')
            .insert({ telegram_id: user.id, score: finalScore });

        if (insertError) return res.status(500).json({ error: insertError.message });

        return res.status(200).json({ success: true });
    }
};

module.exports = cors(handler);