import { createClient } from '@supabase/supabase-js';

// Переменные окружения на Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 

// Проверка инициализации (чтобы не упал весь сервер при первом запросе)
if (!supabaseUrl || !supabaseKey) {
    throw new Error("CRITICAL: Supabase environment variables are missing!");
}

// Создаем клиент с настройками авторизации
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Для серверных функций это ОБЯЗАТЕЛЬНО (чтобы не было утечек памяти)
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});