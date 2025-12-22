const { supabase, verifyTelegramData, cors } = require('./_utils');

const handler = async (req, res) => {
    // GET: Лидерборд
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

        const formattedLeaderboard = top.map(item => ({
            score: item.score,
            username: item.users ? item.users.username : 'Unknown'
        }));

        return res.status(200).json({ leaderboard: formattedLeaderboard });
    }

    // POST: Сохранение или получение через POST
    if (req.method === 'POST') {
        const { initData, score, action } = req.body;

        // Если запрос лидерборда через POST
        if (action === 'get_leaderboard') {
            const { data: top, error } = await supabase
                .from('scores')
                .select('score, users(username)')
                .order('score', { ascending: false })
                .limit(10);
            
            if (error) return res.status(500).json({ error: error.message });
            
            const formatted = top.map(item => ({
                score: item.score,
                username: item.users ? item.users.username : 'Unknown'
            }));
            return res.status(200).json({ leaderboard: formatted });
        }

        // Авторизация для сохранения счета
        const user = verifyTelegramData(initData);
        if (!user) return res.status(403).json({ error: 'Auth failed' });

        const finalScore = parseInt(score);
        if (isNaN(finalScore) || finalScore < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        // --- ИСПРАВЛЕНИЕ: Используем 'id' вместо 'telegram_id' ---
        // Сначала проверяем, есть ли уже рекорд у этого пользователя
        const { data: currentRecord } = await supabase
            .from('scores')
            .select('score')
            .eq('id', user.id) // Здесь 'id' — это ID юзера в таблице scores
            .single();

        if (!currentRecord || finalScore > currentRecord.score) {
            // Обновляем или вставляем (upsert)
            // Чтобы это работало, колонка 'id' должна быть PRIMARY KEY или UNIQUE
            const { error: upsertError } = await supabase
                .from('scores')
                .upsert({ 
                    id: user.id, 
                    score: finalScore 
                }, { onConflict: 'id' });

            if (upsertError) return res.status(500).json({ error: upsertError.message });
        }

        return res.status(200).json({ success: true });
    }
};

module.exports = cors(handler);