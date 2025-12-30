/**
 * api/scores.js - Обработка рекордов и лидерборда на Vercel
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    
    /**
     * Вспомогательная функция для получения ТОП-10
     * Исправлена логика получения имен пользователей
     */
    const getTopScores = async () => {
        const { data: top, error } = await supabase
            .from('scores')
            // Выбираем счет и присоединяем имя из таблицы users
            // !inner гарантирует, что мы не получим записи без пользователя
            .select(`
                score,
                users!inner ( username )
            `)
            .order('score', { ascending: false })
            .limit(10);
            
        if (error) {
            console.error("[LEADERBOARD FETCH ERROR]:", error.message);
            throw error;
        }

        // Преобразуем в плоский формат для фронтенда
        return top.map(item => ({
            score: item.score,
            // Если username пуст, выводим "Player"
            username: item.users?.username || 'Player'
        }));
    };

    // 1. Обработка GET (для проверки в браузере)
    if (req.method === 'GET') {
        try {
            const leaderboard = await getTopScores();
            return res.status(200).json({ leaderboard });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // 2. Обработка POST
    if (req.method === 'POST') {
        const { initData, score, action } = req.body;

        // Если фронтенд запрашивает таблицу через POST
        if (action === 'get_leaderboard') {
            try {
                const leaderboard = await getTopScores();
                return res.status(200).json({ leaderboard });
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }
        }

        // --- ЛОГИКА СОХРАНЕНИЯ РЕКОРДА ---
        const user = verifyTelegramData(initData);
        if (!user) return res.status(403).json({ error: 'Auth failed' });

        const finalScore = parseInt(score);
        // Защита от NaN и отрицательных чисел
        if (isNaN(finalScore) || finalScore < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        try {
            // Ищем старый рекорд игрока
            const { data: currentRecord, error: fetchError } = await supabase
                .from('scores')
                .select('score')
                .eq('id', user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            // Сохраняем ТОЛЬКО если новый рекорд выше старого
            if (!currentRecord || finalScore > currentRecord.score) {
                const { error: upsertError } = await supabase
                    .from('scores')
                    .upsert({ 
                        id: user.id, // Telegram ID
                        score: finalScore,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (upsertError) throw upsertError;
                
                // Также обновим время последней активности в таблице users
                await supabase.from('users').update({ last_sync: new Date() }).eq('id', user.id);

                return res.status(200).json({ success: true, newRecord: true, score: finalScore });
            }

            return res.status(200).json({ success: true, newRecord: false, oldRecord: currentRecord.score });

        } catch (e) {
            console.error("[SCORES SAVE ERROR]:", e.message);
            return res.status(500).json({ error: e.message });
        }
    }
};

export default cors(handler);