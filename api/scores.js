import { supabase } from "./_supabase.js";
import { authenticate } from "./auth.js";

const MAX_SCORE = 1000; // sanity check

export async function POST(req) {
  try {
    const { telegram_id } = await authenticate(req);
    const { score } = await req.json();

    if (typeof score !== "number" || score < 0 || score > MAX_SCORE)
      return new Response("Invalid score", { status: 400 });

    await supabase.from("scores").insert({
      telegram_id,
      score
    });

    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message, { status: 401 });
  }
}

export async function GET() {
  const { data } = await supabase
    .from("scores")
    .select("telegram_id, score")
    .order("score", { ascending: false })
    .limit(10);

  return Response.json(data);
}
