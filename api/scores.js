import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    // Вспомогательная функция для получения ТОП-10
    const getTopScores = async () => {
        const { data: top, error } = await supabase
            .from('scores')
            .select(`
                score,
                users!inner ( username )
            `)
            .order('score', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        return top.map(item => ({
            score: item.score,
            username: item.users ? item.users.username : 'Unknown'
        }));
    };

    // 1. Обработка GET (простой просмотр)
    if (req.method === 'GET') {
        try {
            const leaderboard = await getTopScores();
            return res.status(200).json({ leaderboard });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // 2. Обработка POST (сохранение или запрос из приложения)
    if (req.method === 'POST') {
        const { initData, score, action } = req.body;

        // Если фронтенд просто просит таблицу лидеров
        if (action === 'get_leaderboard') {
            try {
                const leaderboard = await getTopScores();
                return res.status(200).json({ leaderboard });
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }
        }

        // Если это сохранение рекорда (action === 'save_score' или просто наличие score)
        const user = verifyTelegramData(initData);
        if (!user) return res.status(403).json({ error: 'Auth failed' });

        const finalScore = parseInt(score);
        if (isNaN(finalScore) || finalScore < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        try {
            // Проверяем старый рекорд
            const { data: currentRecord } = await supabase
                .from('scores')
                .select('score')
                .eq('id', user.id)
                .maybeSingle();

            // Сохраняем, только если новый счет больше или рекорда еще нет
            if (!currentRecord || finalScore > currentRecord.score) {
                const { error: upsertError } = await supabase
                    .from('scores')
                    .upsert({ 
                        id: user.id, // Это Telegram ID
                        score: finalScore,
                        updated_at: new Date()
                    }, { onConflict: 'id' });

                if (upsertError) throw upsertError;
                return res.status(200).json({ success: true, newRecord: true });
            }

            return res.status(200).json({ success: true, newRecord: false });

        } catch (e) {
            console.error("[SCORES POST ERROR]:", e.message);
            return res.status(500).json({ error: e.message });
        }
    }
};

export default cors(handler);