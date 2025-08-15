export default async function handler(req, res) {
  const { key, chatId, message } = req.query;

  // 🔹 Ganti ini dengan API Key rahasia kamu
  const API_KEY = process.env.MY_SECRET_KEY || "SECRET123";

  // Cek API Key
  if (key !== API_KEY) {
    return res.status(403).json({ ok: false, error: "Forbidden - Invalid API Key" });
  }

  // Cek parameter
  if (!chatId || !message) {
    return res.status(400).json({ ok: false, error: "chatId and message are required" });
  }

  // Token bot Telegram
  const token = process.env.TELEGRAM_TOKEN || "ISI_TOKEN_BOT_KAMU";
  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    const data = await telegramRes.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
