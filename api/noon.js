export default async function handler(req, res) {
  const url = "https://script.google.com/macros/s/AKfycbwSbJYOS08s0Bxwvt2v_HAF7l6rWpmYVX8BdpmCCKK0xV3rE8FWdjQQSXJKsHpsdnuaPg/exec?action=noon";

  try {
    const r = await fetch(url);
    const data = await r.text();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
}
