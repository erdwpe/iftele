// MPL ID Schedule Telegram Bot
// - Scrapes https://id-mpl.com/schedule for upcoming matches
// - Commands: /today, /tomorrow, /week, /all, /team <nama>
// - Works on Vercel (serverless webhook) or locally (long polling)
//
// ENV VARS:
// TELEGRAM_BOT_TOKEN=123:ABC
// TELEGRAM_WEBHOOK_SECRET=some-secret (optional but recommended)
// BOT_PUBLIC_URL=https://your-vercel-domain.vercel.app (only for setting webhook programmatically)
// TZ is assumed Asia/Jakarta

import { Telegraf } from 'telegraf'
import fetch from 'node-fetch'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

// --- dayjs setup ---
dayjs.extend(utc)
dayjs.extend(timezone)
const TZ = 'Asia/Jakarta'

// --- helpers ---
const MONTHS_ID_SHORT = {
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'Mei': 5, 'Jun': 6,
  'Jul': 7, 'Agt': 8, 'Sep': 9, 'Okt': 10, 'Nov': 11, 'Des': 12
}

/** Parse schedule page into structured matches.
 * The page contains blocks like:
 *   ONIC / VS / DEWA and a line "22 Agt | 15:15"
 * We scan text lines to capture date+time lines then grab nearest team names above/below.
 */
async function fetchMatches () {
  const res = await fetch('https://id-mpl.com/schedule', {
    headers: {
      'user-agent': 'Mozilla/5.0 (TelegramBot)'
    }
  })
  if (!res.ok) throw new Error('Failed to fetch schedule: ' + res.status)
  const html = await res.text()

  // Extract all text content without tags (very tolerant approach)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\u00a0/g, ' ')

  // Normalize lines
  const rawLines = text.split(/\n+/).map(s => s.trim()).filter(Boolean)

  const lines = []
  for (const l of rawLines) {
    // drop single glyphs like ":" or "×" etc
    if (/^[|×x]$/.test(l)) continue
    lines.push(l)
  }

  // Helper to find previous/next uppercase team token near an index
  const teamLike = (s) => /^[A-Z]{2,6}$/.test(s) && !['VS', 'REPLAY', 'WATCH', 'Details', 'SOLD', 'OUT'].includes(s)

  const dateTimeRegex = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agt|Sep|Okt|Nov|Des)\s*\|\s*(\d{2}:\d{2})$/

  const matches = []

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(dateTimeRegex)
    if (!m) continue
    const [_, dStr, monId, timeStr] = m
    const day = parseInt(dStr, 10)
    const month = MONTHS_ID_SHORT[monId]

    // assume current/visible season year is present elsewhere; fallback to current year
    let year = dayjs().tz(TZ).year()

    // try to detect year from a preceding date header like "Jumat, 22 Agustus 2025"
    for (let j = i; j >= 0 && j >= i - 30; j--) {
      const y = lines[j].match(/\b(20\d{2})\b/)
      if (y) { year = parseInt(y[1], 10); break }
    }

    // find team A above
    let teamA = null
    for (let up = i - 1; up >= 0 && up >= i - 10; up--) {
      if (teamLike(lines[up])) { teamA = lines[up]; break }
    }
    // find team B below
    let teamB = null
    for (let dn = i + 1; dn < lines.length && dn <= i + 10; dn++) {
      if (teamLike(lines[dn])) { teamB = lines[dn]; break }
    }

    if (!teamA || !teamB) continue // skip if unreliable block

    const iso = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timeStr}`, TZ)

    matches.push({
      teamA, teamB,
      date: iso.format('YYYY-MM-DD'),
      time: iso.format('HH:mm'),
      ts: iso.valueOf()
    })
  }

  // Deduplicate (page often repeats info in card + list)
  const seen = new Set()
  const unique = []
  for (const m of matches) {
    const key = `${m.date}-${m.time}-${m.teamA}-${m.teamB}`
    if (!seen.has(key)) { seen.add(key); unique.push(m) }
  }

  // sort by time
  unique.sort((a, b) => a.ts - b.ts)

  return unique
}

function formatMatchLine (m) {
  const dayId = dayjs.tz(m.ts, TZ).format('dddd, D MMMM YYYY')
  const timeId = dayjs.tz(m.ts, TZ).format('HH:mm')
  return `• *${m.teamA}* vs *${m.teamB}*\n  ${dayId} — ${timeId} WIB`
}

function groupByDate (matches) {
  const map = new Map()
  for (const m of matches) {
    const key = dayjs.tz(m.ts, TZ).format('YYYY-MM-DD')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(m)
  }
  return map
}

async function renderToday () {
  const all = await fetchMatches()
  const todayKey = dayjs().tz(TZ).format('YYYY-MM-DD')
  const todayMatches = all.filter(m => m.date === todayKey)
  if (todayMatches.length === 0) return 'Tidak ada match hari ini.'
  return `*Jadwal MPL ID — Hari Ini*\n\n${todayMatches.map(formatMatchLine).join('\n\n')}`
}

async function renderTomorrow () {
  const all = await fetchMatches()
  const key = dayjs().tz(TZ).add(1, 'day').format('YYYY-MM-DD')
  const ms = all.filter(m => m.date === key)
  if (ms.length === 0) return 'Tidak ada match untuk besok.'
  return `*Jadwal MPL ID — Besok*\n\n${ms.map(formatMatchLine).join('\n\n')}`
}

async function renderWeek () {
  const all = await fetchMatches()
  const start = dayjs().tz(TZ)
  const end = start.add(7, 'day')
  const ms = all.filter(m => dayjs(m.ts).isAfter(start.subtract(1, 'minute')) && dayjs(m.ts).isBefore(end))
  if (ms.length === 0) return 'Tidak ada match 7 hari ke depan.'
  const grouped = groupByDate(ms)
  let out = '*Jadwal MPL ID — 7 Hari Ke Depan*\n\n'
  for (const key of Array.from(grouped.keys()).sort()) {
    const head = dayjs.tz(key, TZ).format('dddd, D MMMM YYYY')
    out += `*${head}*\n`
    out += grouped.get(key).map(m => `  ${m.teamA} vs ${m.teamB} — ${dayjs.tz(m.ts, TZ).format('HH:mm')} WIB`).join('\n')
    out += '\n\n'
  }
  return out.trim()
}

async function renderAllUpcoming (days = 30) {
  const all = await fetchMatches()
  const start = dayjs().tz(TZ)
  const end = start.add(days, 'day')
  const ms = all.filter(m => dayjs(m.ts).isAfter(start.subtract(1, 'minute')) && dayjs(m.ts).isBefore(end))
  if (ms.length === 0) return 'Tidak ada match mendatang.'
  return `*Jadwal MPL ID — ${days} Hari Ke Depan*\n\n${ms.map(formatMatchLine).join('\n\n')}`
}

async function renderTeam (q) {
  const name = (q || '').toUpperCase().trim()
  if (!name) return 'Format: /team <nama tim> (contoh: /team RRQ)'
  const all = await fetchMatches()
  const ms = all.filter(m => m.teamA.includes(name) || m.teamB.includes(name))
  if (ms.length === 0) return `Tidak ada match untuk tim “${name}”.`
  return `*Jadwal ${name}*\n\n${ms.map(formatMatchLine).join('\n\n')}`
}

// --- Bot setup ---
const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required')
const bot = new Telegraf(token, {
  telegram: { webhookReply: true }
})

bot.start(ctx => ctx.reply('Halo! Kirim /today, /tomorrow, /week, /all, atau /team <nama>.'))
bot.command('today', async ctx => ctx.replyWithMarkdown(await renderToday()))
bot.command('tomorrow', async ctx => ctx.replyWithMarkdown(await renderTomorrow()))
bot.command('week', async ctx => ctx.replyWithMarkdown(await renderWeek()))
bot.command('all', async ctx => ctx.replyWithMarkdown(await renderAllUpcoming(30)))
bot.command('team', async ctx => {
  const q = ctx.message.text.split(/\s+/).slice(1).join(' ')
  ctx.replyWithMarkdown(await renderTeam(q))
})

// Health check & manual broadcast endpoint for serverless
// Example: GET /api/bot?secret=YOUR_SECRET&action=broadcast_today&chat_id=12345
async function httpHandler (req, res) {
  const url = new URL(req.url, 'http://x')
  const action = url.searchParams.get('action')
  const secret = url.searchParams.get('secret')
  const chatId = url.searchParams.get('chat_id')

  if (req.method === 'GET' && !action) {
    res.statusCode = 200
    res.end('ok')
    return
  }

  if (action === 'broadcast_today') {
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      res.statusCode = 403
      res.end('forbidden')
      return
    }
    if (!chatId) { res.statusCode = 400; res.end('chat_id required'); return }
    const text = await renderToday()
    await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    res.statusCode = 200
    res.end('sent')
    return
  }

  // Telegraf webhook handler
  return bot.webhookCallback('/api/bot')(req, res)
}

// --- Vercel export (serverless) ---
export default async function handler (req, res) {
  return httpHandler(req, res)
}

// --- Local run (long polling) ---
if (process.env.NODE_ENV !== 'production' && process.env.LOCAL === '1') {
  console.log('Running locally with long polling...')
  bot.launch()
}

// NOTE: For Vercel, set the webhook once (one-time):
// curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
//   -d url="$BOT_PUBLIC_URL/api/bot" \
//   -d secret_token="$TELEGRAM_WEBHOOK_SECRET"

// Optional vercel.json:
// {
//   "functions": { "api/bot.js": { "maxDuration": 10 } },
//   "routes": [
//     { "src": "/api/bot", "dest": "/api/bot.js" }
//   ]
// }
