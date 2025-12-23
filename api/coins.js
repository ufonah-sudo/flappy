import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    const { initData, action, amount } = req.body;
    
    // Валидация через наш обновленный _utils.js
    const user = verifyTelegramData(initData);
    if (!user) return res.status(403).json({ error: 'Invalid auth' });

    try {
        if (action === 'spend') {
            // 1. Получаем текущий баланс. Используем 'id', как в auth.js
            const { data: dbUser, error: fetchError } = await supabase
                .from('users')
                .select('coins')
                .eq('id', user.id)
                .single();
            
            if (fetchError || !dbUser) throw new Error('User not found in DB');
            if (dbUser.coins < 1) return res.status(400).json({ success: false, message: 'Not enough coins' });

            // 2. Списываем монету
            const { data, error } = await supabase
                .from('users')
                .update({ coins: dbUser.coins - 1 })
                .eq('id', user.id)
                .select()
                .single();
            
            if (error) throw error;
                
            return res.status(200).json({ success: true, newBalance: data.coins });
        }

        if (action === 'buy') {
            // Расчет монет: 1 TON = 10 монет (как в твоем коде)
            const coinsToAdd = (parseInt(amount) || 0) * 10; 
            
            // Используем RPC. 
            // ВАЖНО: Параметры должны называться точно так же, как в твоем SQL (user_id_param)
            const { error: rpcError } = await supabase
                .rpc('increment_coins', { 
                    user_id_param: user.id, 
                    amount: coinsToAdd 
                });
            
            if (rpcError) {
                console.error("RPC Error, falling back to manual update:", rpcError);
                // Фолбэк, если RPC не создан в Supabase
                const { data: currentUser } = await supabase.from('users').select('coins').eq('id', user.id).single();
                await supabase.from('users').update({ coins: (currentUser.coins || 0) + coinsToAdd }).eq('id', user.id);
            }

            // Получаем финальный баланс для фронтенда
            const { data: updatedUser } = await supabase
                .from('users')
                .select('coins')
                .eq('id', user.id)
                .single();

            return res.status(200).json({ success: true, newBalance: updatedUser.coins });
        }
        
        return res.status(400).json({ error: 'Unknown action' });

    } catch (e) {
        console.error("Coins error:", e.message);
        return res.status(500).json({ error: e.message });
    }
};

export default cors(handler);