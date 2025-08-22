export default async function handler(req, res) {
  const url = "https://script.google.com/macros/s/AKfycbycSV_ONwUwV-Nm8akqwJmOZMsd7MEaVWiqt0gwkWCadrR9YrKqr4aC4SrfI6lmPI9dYw/exec?action=noon";

  try {
    const r = await fetch(url);
    const data = await r.text();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
}
