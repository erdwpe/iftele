import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  const filePath = path.join(process.cwd(), 'view', 'index.html');
  const html = await fs.readFile(filePath, 'utf8');

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
