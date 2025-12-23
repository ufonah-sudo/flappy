import { createClient } from '@supabase/supabase-js'

// Берем именно те названия, которые ты ввел в панели Vercel
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY 

if (!supabaseUrl || !supabaseKey) {
    console.error("ОШИБКА: Переменные SUPABASE_URL или SUPABASE_SERVICE_KEY не найдены в Vercel!");
}

export const supabase = createClient(supabaseUrl, supabaseKey)