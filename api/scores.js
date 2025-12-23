import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    // GET: Лидерборд (прямой запрос)
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

    // POST: Сохранение или получение лидерборда через POST
    if (req.method === 'POST') {
        const { initData, score, action } = req.body;

        // Обработка запроса лидерборда через POST (как вызывает фронтенд)
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

        // Авторизация для сохранения нового рекорда
        const user = verifyTelegramData(initData);
        if (!user) return res.status(403).json({ error: 'Auth failed' });

        const finalScore = parseInt(score);
        if (isNaN(finalScore) || finalScore < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        // Проверяем текущий рекорд пользователя
        // ВАЖНО: 'id' в таблице scores — это Telegram ID игрока
        const { data: currentRecord } = await supabase
            .from('scores')
            .select('score')
            .eq('id', user.id)
            .maybeSingle();

        // Обновляем, если рекорда нет ИЛИ новый счет больше старого
        if (!currentRecord || finalScore > currentRecord.score) {
            const { error: upsertError } = await supabase
                .from('scores')
                .upsert({ 
                    id: user.id, 
                    score: finalScore 
                }, { onConflict: 'id' });

            if (upsertError) {
                console.error("Upsert Score Error:", upsertError);
                return res.status(500).json({ error: upsertError.message });
            }
        }

        return res.status(200).json({ success: true });
    }
};

export default cors(handler);