// api/sendMessage.js
export default async function handler(req, res) {
  const { key, text } = req.query;

  // Cek API key sederhana
  if (key !== process.env.MY_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const telegramRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: text,
      }),
    });

    const data = await telegramRes.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
