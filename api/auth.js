import crypto from "crypto";
import { supabase } from "./_supabase.js";

function validateInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const data = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(process.env.BOT_TOKEN)
    .digest();

  const checkHash = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return checkHash === hash;
}

export async function authenticate(req) {
  const initData = req.headers.get("x-init-data");
  if (!initData) throw new Error("No initData");

  if (!validateInitData(initData)) throw new Error("Invalid initData");

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));
  const telegram_id = user.id;

  // create user if not exists
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegram_id)
    .single();

  if (!existing) {
    await supabase.from("users").insert({
      telegram_id,
      username: user.username || null,
      coins: 1 // 🎁 1 бесплатный Coin при первом запуске
    });
  }

  return { telegram_id };
}
