export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { token, chatId, text } = req.body;

    if (!token || !chatId || !text) {
      return res.status(400).json({ ok: false, error: 'Missing parameters' });
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    const telegramRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });

    const data = await telegramRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
