# ⚡ SportWeek — Weekly Sports Schedule

A beautiful, offline-capable sports schedule app for Cricket, Football, F1, and Badminton — all times in IST.

## Features
- 🏏 **Cricket** — ICC Men's & Women's, IPL, Indian domestic
- ⚽ **Football** — Premier League, La Liga, UEFA Champions League, Bundesliga, Serie A, MLS
- 🏎️ **Formula 1** — Race weekends, qualifying, sprint sessions
- 🏸 **Badminton** — BWF World Tour
- 🌙 **Dark/Light mode** toggle
- 📡 **Offline support** via Service Worker + localStorage cache
- 🕐 All times in **Indian Standard Time (IST)**
- 📱 **PWA installable** on mobile

## Data Source
Uses **TheSportsDB** free API (no API key required for basic queries).

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm i -g vercel
cd sports-schedule
vercel
```

### Option 2: GitHub + Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the repo
4. Click Deploy — done!

### Option 3: One-click drag & drop
1. Go to [vercel.com/new](https://vercel.com/new)
2. Drag and drop this entire `sports-schedule` folder
3. Deploy!

## Local Development
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Customization

### Add more leagues
Edit `pages/api/sports.js` — add entries to the `LEAGUES` object with the TheSportsDB league ID.

Find league IDs at: `https://www.thesportsdb.com/api/v1/json/3/all_leagues.php`

### Change week range
The app shows events from **today to 7 days ahead**. Edit `getWeekRange()` in `pages/api/sports.js`.

## Offline Mode
- On first load, data is cached in `localStorage`
- Service worker caches API responses
- If offline, the last fetched data is shown with a "Cached" badge

## Tech Stack
- **Next.js 14** — Framework
- **TheSportsDB API** — Sports data (free, no key needed)
- **Service Worker** — Offline support
- **PWA manifest** — Installable on mobile
- **CSS-in-JS** (styled-jsx) — Theming
- **Google Fonts** — Syne + DM Sans
