//noon 

export default async function handler(req, res) {
  const url = "https://script.google.com/macros/s/AKfycbxWQj2buZii-Fj5l575dl_Vdobu4FQ8fIPf8B_FDyCNlEODTxTkJYdhsLFkROcuyOnxqQ/exec?action=noon";

  try {
    const r = await fetch(url);
    const data = await r.text();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
}
