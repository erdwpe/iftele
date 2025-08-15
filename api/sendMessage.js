import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Kalau parameter ?page=html => kirim file HTML
  if (req.query.page === 'html') {
    const filePath = path.join(process.cwd(), 'view', 'index.html');
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

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
