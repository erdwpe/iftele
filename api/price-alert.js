// api/price-alert.js
export default async function handler(req, res) {
  const TELEGRAM_API = "https://iftele-erdwpes-projects.vercel.app/api/sendMessage";
  const TELEGRAM_KEY = "SECRET123";
  const CHAT_ID = "6391044321";

  // Coin yang dipantau (CoinGecko IDs)
  const coins = ["cardano", "solana", "arbitrum", "ripple"];
  const ALERT_PERCENT = 5; // Notif kalau naik/turun >= 5%

  try {
    // Ambil data dari CoinGecko
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(
      ","
    )}&vs_currencies=idr&include_24hr_change=true`;

    const resp = await fetch(url);
    const data = await resp.json();

    let alerts = [];

    for (let coin of coins) {
      const price = data[coin].idr;
      const change = data[coin].idr_24h_change;

      if (Math.abs(change) >= ALERT_PERCENT) {
        const symbol = coin.toUpperCase();
        const arrow = change > 0 ? "📈" : "📉";
        alerts.push(`${arrow} ${symbol}: Rp${price.toLocaleString("id-ID")} (${change.toFixed(2)}%)`);
      }
    }

    if (alerts.length > 0) {
      const message = `🚨 Update harga kripto:\n${alerts.join("\n")}`;
      await fetch(
        `${TELEGRAM_API}?key=${TELEGRAM_KEY}&chatId=${CHAT_ID}&text=${encodeURIComponent(message)}`
      );
    }

    res.status(200).json({ success: true, checked: coins.length, alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
