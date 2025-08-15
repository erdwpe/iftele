import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'view', 'index.html');
    const html = await fs.readFile(filePath, 'utf8');

    res.setHeader('Content-Type', 'text/html');
    res.status(200).end(html);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load HTML' });
  }
}
