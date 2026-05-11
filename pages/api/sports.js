// TheSportsDB API - free tier (no key needed for basic queries)
const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

// League IDs from TheSportsDB
const LEAGUES = {
  // Cricket
  cricket_icc_mens: { id: "4844", name: "ICC Men's Cricket", sport: "cricket" },
  cricket_icc_womens: { id: "4759", name: "ICC Women's Cricket", sport: "cricket" },
  cricket_ipl: { id: "4910", name: "IPL", sport: "cricket" },
  // Football
  premier_league: { id: "4328", name: "Premier League", sport: "football" },
  la_liga: { id: "4335", name: "La Liga", sport: "football" },
  ucl: { id: "4480", name: "UEFA Champions League", sport: "football" },
  bundesliga: { id: "4331", name: "Bundesliga", sport: "football" },
  serie_a: { id: "4332", name: "Serie A", sport: "football" },
  mls: { id: "4346", name: "MLS", sport: "football" },
  // F1
  f1: { id: "4370", name: "Formula 1", sport: "f1" },
  // Badminton
  bwf: { id: "4855", name: "BWF World Tour", sport: "badminton" },
};

function toIST(utcDateStr, utcTimeStr) {
  try {
    const dateTimeStr = utcTimeStr
      ? `${utcDateStr}T${utcTimeStr}Z`
      : `${utcDateStr}T00:00:00Z`;
    const dt = new Date(dateTimeStr);
    if (isNaN(dt.getTime())) return { date: utcDateStr, time: utcTimeStr || "TBD" };
    // IST = UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDt = new Date(dt.getTime() + istOffset);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dayName = days[istDt.getUTCDay()];
    const dateFormatted = `${dayName}, ${istDt.getUTCDate()} ${months[istDt.getUTCMonth()]} ${istDt.getUTCFullYear()}`;
    const h = istDt.getUTCHours();
    const m = istDt.getUTCMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const timeFormatted = utcTimeStr
      ? `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm} IST`
      : "Time TBD";
    return { date: dateFormatted, time: timeFormatted, raw: istDt.toISOString() };
  } catch {
    return { date: utcDateStr, time: "TBD", raw: utcDateStr };
  }
}

function getWeekRange() {
  const now = new Date();
  // Current week: today to 7 days ahead
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

async function fetchLeagueEvents(leagueId) {
  try {
    const res = await fetch(
      `${TSDB_BASE}/eventsnextleague.php?id=${leagueId}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

async function fetchLeaguePastEvents(leagueId) {
  try {
    const res = await fetch(
      `${TSDB_BASE}/eventspastleague.php?id=${leagueId}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const { start, end } = getWeekRange();

  const allEvents = [];

  // Fetch all leagues in parallel
  const leagueKeys = Object.keys(LEAGUES);
  const fetches = leagueKeys.map(async (key) => {
    const league = LEAGUES[key];
    const [nextEvents, pastEvents] = await Promise.all([
      fetchLeagueEvents(league.id),
      fetchLeaguePastEvents(league.id),
    ]);
    return { key, league, events: [...nextEvents, ...pastEvents] };
  });

  const results = await Promise.all(fetches);

  for (const { league, events } of results) {
    for (const ev of events) {
      const evDate = new Date(ev.dateEvent + "T00:00:00Z");
      if (evDate >= start && evDate <= end) {
        const ist = toIST(ev.dateEvent, ev.strTime);
        allEvents.push({
          id: ev.idEvent,
          sport: league.sport,
          leagueName: league.name,
          homeTeam: ev.strHomeTeam,
          awayTeam: ev.strAwayTeam,
          venue: ev.strVenue || ev.strCountry || "",
          country: ev.strCountry || "",
          dateIST: ist.date,
          timeIST: ist.time,
          rawIST: ist.raw,
          status: ev.strStatus || "Upcoming",
          homeScore: ev.intHomeScore,
          awayScore: ev.intAwayScore,
          thumbnail: ev.strThumb || ev.strBanner || null,
          season: ev.strSeason || "",
          round: ev.intRound || ev.strRound || "",
          description: ev.strDescriptionEN || "",
        });
      }
    }
  }

  // Sort by raw date
  allEvents.sort((a, b) => new Date(a.rawIST) - new Date(b.rawIST));

  // Group by sport
  const grouped = {
    cricket: allEvents.filter((e) => e.sport === "cricket"),
    football: allEvents.filter((e) => e.sport === "football"),
    f1: allEvents.filter((e) => e.sport === "f1"),
    badminton: allEvents.filter((e) => e.sport === "badminton"),
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
