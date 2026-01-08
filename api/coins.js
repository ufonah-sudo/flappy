/**
 * api/coins.js - ЭКОНОМИКА (TON -> Кристаллы -> Энергия/Монеты)
 */
import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    const { initData, action, item, packageType } = req.body;
    
    const user = verifyTelegramData(initData);
    if (!user) return res.status(403).json({ error: 'Invalid auth' });

    try {
        // --- 1. ПОКУПКА ЗА TON (TON -> КРИСТАЛЛЫ / МОНЕТЫ) ---
        if (action === 'buy_package') {
            let coinsAdd = 0;
            let crystalsAdd = 0;

            if (packageType === 'coins_10k') {
                coinsAdd = 10000;
            } else if (packageType === 'crystals_10') { // Новое: 10 Кристаллов
                crystalsAdd = 10;
            } else if (packageType === 'crystals_50') { // Пример: Пакет больше
                crystalsAdd = 50; 
            } else {
                return res.status(400).json({ error: 'Invalid package' });
            }

            // Получаем текущие данные
            const { data: current, error: fetchErr } = await supabase
                .from('users').select('coins, crystals').eq('id', user.id).single();
            if (fetchErr) throw fetchErr;

            const newCoins = (current.coins || 0) + coinsAdd;
            const newCrystals = (current.crystals || 0) + crystalsAdd;

            // Сохраняем
            const { error: updateErr } = await supabase
                .from('users')
                .update({ coins: newCoins, crystals: newCrystals, last_sync: new Date() })
                .eq('id', user.id);

            if (updateErr) throw updateErr;

            return res.status(200).json({ success: true, newCoins, newCrystals });
        }

        // --- 2. ОБМЕН КРИСТАЛЛОВ (КРИСТАЛЛЫ -> ЭНЕРГИЯ) ---
        if (action === 'exchange_crystals') {
            // Конфиг обмена: 1 Кристалл = 5 Энергии
            // В базе данных "lives" это энергия
            const COST_CRYSTALS = 1;
            const ENERGY_REWARD = 5;

            const { data: dbUser } = await supabase
                .from('users').select('crystals, lives').eq('id', user.id).single();

            if (!dbUser || dbUser.crystals < COST_CRYSTALS) {
                return res.status(400).json({ error: 'Недостаточно кристаллов 💎' });
            }

            const newCrystals = dbUser.crystals - COST_CRYSTALS;
            const newLives = (dbUser.lives || 0) + ENERGY_REWARD;

            const { error: exError } = await supabase
                .from('users')
                .update({ crystals: newCrystals, lives: newLives })
                .eq('id', user.id);

            if (exError) throw exError;

            return res.status(200).json({ 
                success: true, 
                newCrystals: newCrystals, 
                newLives: newLives 
            });
        }

        // --- 3. ПОКУПКА СПОСОБНОСТЕЙ ЗА МОНЕТЫ (КАК БЫЛО) ---
        if (action === 'buy_item') {
            const prices = { heart: 50, shield: 20, gap: 20, magnet: 30, ghost: 25 };
            const cost = prices[item];
            if (!cost) return res.status(400).json({ error: 'Item not found' });

            const { data: dbUser } = await supabase
                .from('users').select('coins, powerups').eq('id', user.id).single();

            if (dbUser.coins < cost) return res.status(400).json({ error: 'Недостаточно монет' });

            const currentPowerups = dbUser.powerups || {};
            const newCount = (currentPowerups[item] || 0) + 1;
            
            const { data: updatedUser } = await supabase
                .from('users')
                .update({ 
                    coins: dbUser.coins - cost,
                    powerups: { ...currentPowerups, [item]: newCount }
                })
                .eq('id', user.id)
                .select().single();

            return res.status(200).json({ success: true, newBalance: updatedUser.coins });
        }

        return res.status(400).json({ error: `Unknown action: ${action}` });

    } catch (e) {
        console.error("[COINS ERROR]:", e.message);
        return res.status(500).json({ error: e.message });
    }
};

export default cors(handler);
