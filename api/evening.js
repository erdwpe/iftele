export default async function handler(req, res) {
  const url = "https://script.google.com/macros/s/AKfycbxXDzTjuIxp5M-zyS1UJHSuUYhQSXNyPcmXUBJh2v3jK4e9lDwp1_qAWekXPJz7NfYC0w/exec?action=evening";

  try {
    const r = await fetch(url);
    const data = await r.text();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
}
