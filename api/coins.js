import { supabase } from "./_supabase.js";
import { authenticate } from "./auth.js";

export async function GET(req) {
  try {
    const { telegram_id } = await authenticate(req);

    const { data } = await supabase
      .from("users")
      .select("coins")
      .eq("telegram_id", telegram_id)
      .single();

    return Response.json({ coins: data.coins });
  } catch (e) {
    return new Response(e.message, { status: 401 });
  }
}

export async function POST(req) {
  try {
    const { telegram_id } = await authenticate(req);
    const { action } = await req.json();

    const { data: user } = await supabase
      .from("users")
      .select("coins")
      .eq("telegram_id", telegram_id)
      .single();

    if (action === "spend") {
      if (user.coins < 1)
        return new Response("Not enough coins", { status: 400 });

      await supabase
        .from("users")
        .update({ coins: user.coins - 1 })
        .eq("telegram_id", telegram_id);
    }

    if (action === "buy_mock") {
      // MOCK: 1 TON = 10 Coins
      await supabase
        .from("users")
        .update({ coins: user.coins + 10 })
        .eq("telegram_id", telegram_id);
    }

    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message, { status: 401 });
  }
}
