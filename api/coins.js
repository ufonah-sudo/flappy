/**
 * api/coins.js - Обработка транзакций с монетами на стороне сервера (Vercel)
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    // Извлекаем данные из запроса. item — это ID способности (например, 'shield')
    const { initData, action, amount, item } = req.body;
    
    // Проверка авторизации Telegram
    const user = verifyTelegramData(initData);
    if (!user) return res.status(403).json({ error: 'Invalid auth' });

    try {
        // --- 1. ЛОГИКА ПОКУПКИ СПОСОБНОСТЕЙ (ТО, ЧЕГО НЕ ХВАТАЛО) ---
        if (action === 'buy_item') {
            // Конфигурация цен (должна совпадать с фронтендом для безопасности)
            const prices = {
                heart: 50,
                shield: 20,
                gap: 20,
                magnet: 30,
                ghost: 25
            };

            const cost = prices[item];
            if (!cost) return res.status(400).json({ error: 'Item not found' });

            // Получаем текущие данные пользователя из базы
            const { data: dbUser, error: fetchError } = await supabase
                .from('users')
                .select('coins, powerups')
                .eq('id', user.id)
                .single();
            
            if (fetchError || !dbUser) throw new Error('User not found');
            
            // Проверка баланса на стороне сервера (защита от читов)
            if (dbUser.coins < cost) {
                return res.status(400).json({ error: 'Недостаточно монет' });
            }

            // Подготавливаем обновленный объект способностей
            // Если в базе powerups это NULL или пусто, создаем новый объект
            const currentPowerups = dbUser.powerups || {};
            const newCount = (currentPowerups[item] || 0) + 1;
            
            const updatedPowerups = {
                ...currentPowerups,
                [item]: newCount
            };

            // Сохраняем списание монет и новый предмет одной операцией
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({ 
                    coins: dbUser.coins - cost,
                    powerups: updatedPowerups 
                })
                .eq('id', user.id)
                .select()
                .single();
            
            if (updateError) throw updateError;

            // Возвращаем успех и новые данные для UI
            return res.status(200).json({ 
                success: true, 
                newBalance: updatedUser.coins,
                newItemCount: newCount 
            });
        }

        // --- 2. ЛОГИКА ВОЗРОЖДЕНИЯ (УЖЕ БЫЛА) ---
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

        // --- 3. ЛОГИКА ПОКУПКИ МОНЕТ ЗА TON (УЖЕ БЫЛА) ---
        if (action === 'buy' || action === 'buy_coins') {
            const coinsToAdd = (parseInt(amount) || 0) * 10; 
            if (coinsToAdd <= 0) return res.status(400).json({ error: 'Invalid amount' });

            // Вызов RPC функции increment_coins
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
        
        // Если пришел неизвестный action
        return res.status(400).json({ error: `Unknown action: ${action}` });

    } catch (e) {
        console.error("[COINS ERROR]:", e.message);
        return res.status(500).json({ error: e.message });
    }
};

export default cors(handler);