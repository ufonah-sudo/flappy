import { supabase } from "./_supabase.js";
import { authenticate } from "./auth.js";

export async function POST(req) {
  try {
    const { telegram_id } = await authenticate(req);
    const { inviter_id } = await req.json();

    if (!inviter_id || inviter_id === telegram_id)
      return Response.json({ ignored: true });

    // check if already referred
    const { data: existing } = await supabase
      .from("referrals")
      .select("*")
      .eq("invited_id", telegram_id)
      .single();

    if (existing) return Response.json({ ignored: true });

    await supabase.from("referrals").insert({
      inviter_id,
      invited_id: telegram_id
    });

    // 🎁 +2 Coins inviter
    await supabase.rpc("add_coins", {
      user_id: inviter_id,
      amount: 2
    });

    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message, { status: 401 });
  }
}
