const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const CRICKET_API_KEY = "a539af9a-6572-4111-9a4b-c23726cb1d2a";
const CRICKET_BASE = "https://api.cricapi.com/v1";

const TSDB_LEAGUES = {
  premier_league: { id: "4328", name: "Premier League",         sport: "football" },
  la_liga:        { id: "4335", name: "La Liga",                 sport: "football" },
  ucl:            { id: "4480", name: "UEFA Champions League",   sport: "football" },
  bundesliga:     { id: "4331", name: "Bundesliga",              sport: "football" },
  serie_a:        { id: "4332", name: "Serie A",                 sport: "football" },
  ligue_1:        { id: "4334", name: "Ligue 1",                 sport: "football" },
  mls:            { id: "4346", name: "MLS",                     sport: "football" },
  f1:             { id: "4370", name: "Formula 1",               sport: "f1" },
  bwf_tour:       { id: "4855", name: "BWF World Tour",          sport: "badminton" },
  bwf_champs:     { id: "4856", name: "BWF World Championships", sport: "badminton" },
  thomas_uber:    { id: "4857", name: "Thomas & Uber Cup",       sport: "badminton" },
  sudirman:       { id: "4997", name: "Sudirman Cup",            sport: "badminton" },
  bwf_super:      { id: "4998", name: "BWF Super Series",        sport: "badminton" },
  asia_badminton: { id: "5001", name: "Badminton Asia Champs",   sport: "badminton" },
};

// IPL 2026 series ID on CricAPI
const IPL_SERIES_ID = "d5a498c8-7596-4b93-8ab0-e0efc3345312";

function toIST(utcDateStr, utcTimeStr) {
  try {
    const dateTimeStr = utcTimeStr ? `${utcDateStr}T${utcTimeStr}Z` : `${utcDateStr}T00:00:00Z`;
    const dt = new Date(dateTimeStr);
    if (isNaN(dt.getTime())) return { date: utcDateStr, time: "TBD", raw: utcDateStr };
    const istDt = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dateFormatted = `${days[istDt.getUTCDay()]}, ${istDt.getUTCDate()} ${months[istDt.getUTCMonth()]} ${istDt.getUTCFullYear()}`;
    const h = istDt.getUTCHours(), m = istDt.getUTCMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12  = h % 12 === 0 ? 12 : h % 12;
    const timeFormatted = utcTimeStr
      ? `${String(h12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm} IST`
      : "Time TBD";
    return { date: dateFormatted, time: timeFormatted, raw: istDt.toISOString() };
  } catch {
    return { date: utcDateStr, time: "TBD", raw: utcDateStr };
  }
}

function getWeekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

// Extract date string from either dateEvent or strTimestamp
function extractDate(ev) {
  if (ev.dateEvent) return ev.dateEvent;
  if (ev.strTimestamp) return ev.strTimestamp.split("T")[0];
  return null;
}

function extractTime(ev) {
  if (ev.strTime) return ev.strTime;
  if (ev.strTimestamp) return ev.strTimestamp.split("T")[1] || null;
  return null;
}

function inWeek(dateStr, start, end) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d >= start && d <= end;
}

async function tsdbFetch(path) {
  try {
    const res = await fetch(`${TSDB_BASE}${path}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.events || data.event || [];
  } catch { return []; }
}

async function cricFetch(path) {
  try {
    const res = await fetch(`${CRICKET_BASE}${path}&apikey=${CRICKET_API_KEY}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.data || [];
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const { start, end } = getWeekRange();
  const allEvents = [];
  const seenIds = new Set();

  const tsdbFetches = Object.entries(TSDB_LEAGUES).map(async ([, league]) => {
    const [next, past] = await Promise.all([
      tsdbFetch(`/eventsnextleague.php?id=${league.id}`),
      tsdbFetch(`/eventspastleague.php?id=${league.id}`),
    ]);
    return { league, events: [...next, ...past] };
  });

  const badmintonSearches = [
    "Badminton","BWF","All England Badminton","India Open Badminton",
    "Indonesia Open Badminton","Malaysia Open Badminton","Thomas Cup","Uber Cup",
  ].map(async q => ({
    sport: "badminton",
    events: await tsdbFetch(`/searchevents.php?e=${encodeURIComponent(q)}`),
  }));

  const [tsdbResults, badmintonResults, cricCurrent, cricMatches, iplMatches] = await Promise.all([
    Promise.all(tsdbFetches),
    Promise.all(badmintonSearches),
    cricFetch(`/currentMatches?offset=0`),
    cricFetch(`/matches?offset=0`),
    cricFetch(`/series_info?id=${IPL_SERIES_ID}`),
  ]);

  // TSDB football, f1, badminton
  for (const { league, events } of tsdbResults) {
    for (const ev of events) {
      const dateStr = extractDate(ev);
      if (!dateStr || seenIds.has(ev.idEvent)) continue;
      if (!inWeek(dateStr, start, end)) continue;
      seenIds.add(ev.idEvent);
      const ist = toIST(dateStr, extractTime(ev));
      allEvents.push({
        id: ev.idEvent, sport: league.sport, leagueName: league.name,
        homeTeam: ev.strHomeTeam, awayTeam: ev.strAwayTeam,
        venue: ev.strVenue || ev.strCountry || "",
        dateIST: ist.date, timeIST: ist.time, rawIST: ist.raw,
        status: ev.strStatus || "Upcoming",
        homeScore: ev.intHomeScore, awayScore: ev.intAwayScore,
        season: ev.strSeason || "", round: ev.intRound || ev.strRound || "",
      });
    }
  }

  // Badminton search results
  for (const { sport, events } of badmintonResults) {
    for (const ev of events) {
      const dateStr = extractDate(ev);
      if (!dateStr || seenIds.has(ev.idEvent)) continue;
      if (!inWeek(dateStr, start, end)) continue;
      seenIds.add(ev.idEvent);
      const ist = toIST(dateStr, extractTime(ev));
      allEvents.push({
        id: ev.idEvent, sport, leagueName: ev.strLeague || "Badminton",
        homeTeam: ev.strHomeTeam, awayTeam: ev.strAwayTeam,
        venue: ev.strVenue || ev.strCountry || "",
        dateIST: ist.date, timeIST: ist.time, rawIST: ist.raw,
        status: ev.strStatus || "Upcoming",
        homeScore: ev.intHomeScore, awayScore: ev.intAwayScore,
        season: ev.strSeason || "", round: "",
      });
    }
  }

  // CricAPI — all cricket matches
  const allCricMatches = [...cricCurrent, ...cricMatches];

  // Add IPL matches from series_info
  if (iplMatches && iplMatches.matchList) {
    for (const m of iplMatches.matchList) {
      allCricMatches.push({ ...m, series: "IPL 2026" });
    }
  }

  for (const m of allCricMatches) {
    if (!m.id || seenIds.has(m.id)) continue;
    const rawDate = m.dateTimeGMT || m.date || "";
    if (!rawDate) continue;
    const dateOnly = rawDate.split("T")[0];
    const timeOnly = rawDate.includes("T") ? rawDate.split("T")[1] : null;
    if (!inWeek(dateOnly, start, end)) continue;
    seenIds.add(m.id);
    const ist = toIST(dateOnly, timeOnly);
    const teams = m.teams || [];
    const score = m.score || [];
    allEvents.push({
      id: m.id, sport: "cricket",
      leagueName: m.series || m.name?.split(",").slice(1).join(",").trim() || m.matchType || "Cricket",
      homeTeam: teams[0] || "TBD",
      awayTeam: teams[1] || "TBD",
      venue: m.venue || "",
      dateIST: ist.date, timeIST: ist.time, rawIST: ist.raw,
      status: m.status || "Upcoming",
      homeScore: score[0]?.r ?? null,
      awayScore: score[1]?.r ?? null,
      season: "", round: m.matchType || "",
    });
  }

  allEvents.sort((a, b) => new Date(a.rawIST) - new Date(b.rawIST));

  const grouped = {
    cricket:   allEvents.filter(e => e.sport === "cricket"),
    football:  allEvents.filter(e => e.sport === "football"),
    f1:        allEvents.filter(e => e.sport === "f1"),
    badminton: allEvents.filter(e => e.sport === "badminton"),
  };

  res.json({
    success: true,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    events: grouped,
    total: allEvents.length,
    fetchedAt: new Date().toISOString(),
  });
}
