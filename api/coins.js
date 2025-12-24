import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    const { initData, action, amount } = req.body;
    
    const user = verifyTelegramData(initData);
    if (!user) return res.status(403).json({ error: 'Invalid auth' });

    try {
        // Поддерживаем оба варианта именования (spend и spend_revive)
        if (action === 'spend' || action === 'spend_revive') {
            const { data: dbUser, error: fetchError } = await supabase
                .from('users')
                .select('coins')
                .eq('id', user.id)
                .single();
            
            if (fetchError || !dbUser) throw new Error('User not found');
            
            if (dbUser.coins < 1) {
                return res.status(400).json({ success: false, message: 'Not enough coins' });
            }

            const { data, error } = await supabase
                .from('users')
                .update({ coins: dbUser.coins - 1 })
                .eq('id', user.id)
                .select()
                .single();
            
            if (error) throw error;
            return res.status(200).json({ success: true, newBalance: data.coins });
        }

        // Поддерживаем buy и buy_coins
        if (action === 'buy' || action === 'buy_coins') {
            const coinsToAdd = (parseInt(amount) || 0) * 10; 
            
            if (coinsToAdd <= 0) return res.status(400).json({ error: 'Invalid amount' });

            // Используем RPC, который ты создал в Supabase
            const { error: rpcError } = await supabase.rpc('increment_coins', { 
                user_id_param: user.id, 
                amount: coinsToAdd 
            });
            
            if (rpcError) throw rpcError;

            const { data: updatedUser } = await supabase
                .from('users')
                .select('coins')
                .eq('id', user.id)
                .single();

            return res.status(200).json({ success: true, newBalance: updatedUser.coins });
        }
        
        return res.status(400).json({ error: `Unknown action: ${action}` });

    } catch (e) {
        console.error("[COINS ERROR]:", e.message);
        return res.status(500).json({ error: e.message });
    }
};

export default cors(handler);