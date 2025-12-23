import { supabase, verifyTelegramData, cors } from './_utils.js';

const handler = async (req, res) => {
    // 1. CORS (обязательно через await)
    try {
        if (typeof cors === 'function') {
            await cors(req, res);
        }
    } catch (e) {
        console.warn("CORS warning:", e.message);
    }

    // 2. Логирование входящего запроса
    console.log("Incoming request body:", JSON.stringify(req.body));

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { initData, startParam } = req.body;

    if (!initData) {
        console.error("No initData provided");
        return res.status(400).json({ error: 'Missing initData' });
    }

    // 3. Проверка данных Telegram
    const user = verifyTelegramData(initData);

    if (!user) {
        console.error("Telegram verification FAILED for data:", initData);
        return res.status(403).json({ error: 'Invalid signature' });
    }

    console.log(`User verified: ${user.username} (ID: ${user.id})`);

    // 4. Работа с базой данных (Users)
    try {
        let { data: dbUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (fetchError) {
            console.error("Supabase Fetch Error:", fetchError.message);
            return res.status(500).json({ error: 'Database access error' });
        }

        if (!dbUser) {
            console.log("Creating new user...");
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ 
                    id: user.id, 
                    username: user.username || 'Player', 
                    coins: 10 
                })
                .select()
                .single();
            
            if (createError) {
                console.error("User Creation Error details:", createError);
                return res.status(500).json({ error: 'Failed to create user in DB' });
            }
            
            dbUser = newUser;
            console.log("New user created successfully!");

            // 5. Логика рефералов
            if (startParam && String(startParam) !== String(user.id)) {
                try {
                    const inviterId = parseInt(startParam);
                    if (!isNaN(inviterId)) {
                        const { error: refError } = await supabase
                            .from('referrals')
                            .insert({ referrer_id: inviterId, referred_id: user.id });
                        
                        if (!refError) {
                            await supabase.rpc('increment_coins', { 
                                user_id_param: inviterId, 
                                amount: 5 
                            });
                        }
                    }
                } catch (refErr) {
                    console.warn("Referral system error (ignoring):", refErr.message);
                }
            }
        }

        return res.status(200).json({ user: dbUser });

    } catch (globalErr) {
        console.error("Global Auth Error:", globalErr.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ВАЖНО: Оборачиваем экспорт в CORS, чтобы работали запросы с фронтенда
export default cors(handler);