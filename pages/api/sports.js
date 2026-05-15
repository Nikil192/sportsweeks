kconst TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
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
  bwf_tour:       { id: "4855", name: "BWF World Tour",          sport: "badminton" },
  bwf_champs:     { id: "4856", name: "BWF World Championships", sport: "badminton" },
  thomas_uber:    { id: "4857", name: "Thomas & Uber Cup",       sport: "badminton" },
  sudirman:       { id: "4997", name: "Sudirman Cup",            sport: "badminton" },
  bwf_super:      { id: "4998", name: "BWF Super Series",        sport: "badminton" },
  asia_badminton: { id: "5001", name: "Badminton Asia Champs",   sport: "badminton" },
};

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
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 11);
  return { start, end };
}

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
    const res = await fetch(`${TSDB_BASE}${path}`, { cache: "no-store" });
    const data = await res.json();
    return data.events || data.event || [];
  } catch { return []; }
}

async function cricFetch(path) {
  try {
    const res = await fetch(`${CRICKET_BASE}${path}&apikey=${CRICKET_API_KEY}`, { cache: "no-store" });
    const data = await res.json();
    return data.data || [];
  } catch { return []; }
}

async function cricbuzzIPL() {
  try {
    const res = await fetch("https://cricbuzz-cricket.p.rapidapi.com/matches/v1/upcoming", {
      headers: {
        "X-RapidAPI-Key": "30c8f328a9mshbefd10f01c42e39p1e8178jsn93e03897a29d",
        "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com",
      },
      cache: "no-store",
    });
    const data = await res.json();
    const matches = [];
    for (const type of data.typeMatches || []) {
      for (const s of type.seriesMatches || []) {
        const wrapper = s.seriesAdWrapper;
        if (wrapper && wrapper.seriesId === 9241) {
          for (const m of wrapper.matches || []) matches.push(m);
        }
      }
    }
    return matches;
  } catch { return []; }
}

async function cricbuzzIPLLive() {
  try {
    const res = await fetch("https://cricbuzz-cricket.p.rapidapi.com/matches/v1/live", {
      headers: {
        "X-RapidAPI-Key": "30c8f328a9mshbefd10f01c42e39p1e8178jsn93e03897a29d",
        "X-RapidAPI-Host": "cricbuzz-cricket.p.rapidapi.com",
      },
      cache: "no-store",
    });
    const data = await res.json();
    const matches = [];
    for (const type of data.typeMatches || []) {
      for (const s of type.seriesMatches || []) {
        const wrapper = s.seriesAdWrapper;
        if (wrapper && wrapper.seriesId === 9241) {
          for (const m of wrapper.matches || []) matches.push(m);
        }
      }
    }
    return matches;
  } catch { return []; }
}

async function fetchF1Week(start, end) {
  try {
    const events = [];
    const [curRes, nextRes] = await Promise.all([
      fetch("https://api.jolpi.ca/ergast/f1/2026/current.json", { cache: "no-store" }),
      fetch("https://api.jolpi.ca/ergast/f1/2026/next.json", { cache: "no-store" }),
    ]);
    const curData = await curRes.json();
    const nextData = await nextRes.json();
    const races = [
      ...(curData.MRData?.RaceTable?.Races || []),
      ...(nextData.MRData?.RaceTable?.Races || []),
    ];
    for (const race of races) {
      const gp = race.raceName;
      const circuit = race.Circuit?.circuitName || "";
      const city = race.Circuit?.Location?.locality || "";
      const venue = `${circuit}, ${city}`;
      const sessions = [
        { name: "Practice 1",        date: race.FirstPractice?.date,    time: race.FirstPractice?.time },
        { name: "Practice 2",        date: race.SecondPractice?.date,   time: race.SecondPractice?.time },
        { name: "Practice 3",        date: race.ThirdPractice?.date,    time: race.ThirdPractice?.time },
        { name: "Sprint Qualifying", date: race.SprintQualifying?.date, time: race.SprintQualifying?.time },
        { name: "Sprint",            date: race.Sprint?.date,           time: race.Sprint?.time },
        { name: "Qualifying",        date: race.Qualifying?.date,       time: race.Qualifying?.time },
        { name: "Race",              date: race.date,                   time: race.time },
      ];
      for (const session of sessions) {
        if (!session.date) continue;
        if (!inWeek(session.date, start, end)) continue;
        const timeUTC = session.time ? session.time.replace("Z", "") : null;
        const ist = toIST(session.date, timeUTC);
        events.push({
          id: `f1_${race.round}_${session.name.replace(/\s/g, "_")}`,
          sport: "f1",
          leagueName: "Formula 1 — " + gp,
          homeTeam: session.name,
          awayTeam: `Round ${race.round}`,
          venue,
          dateIST: ist.date,
          timeIST: ist.time,
          rawIST: ist.raw,
          status: "Upcoming",
          homeScore: null,
          awayScore: null,
          season: "2026",
          round: session.name,
        });
      }
    }
    return events;
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

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

  const [
    tsdbResults,
    badmintonResults,
    cricCurrent,
    cricMatches0,
    cricMatches1,
    cricMatches2,
    iplUpcoming,
    iplLive,
    f1Events,
  ] = await Promise.all([
    Promise.all(tsdbFetches),
    Promise.all(badmintonSearches),
    cricFetch(`/currentMatches?offset=0`),
    cricFetch(`/matches?offset=0`),
    cricFetch(`/matches?offset=25`),
    cricFetch(`/matches?offset=50`),
    cricbuzzIPL(),
    cricbuzzIPLLive(),
    fetchF1Week(start, end),
  ]);

  // TSDB — football and badminton
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

  // F1 sessions from Jolpica
  for (const ev of f1Events) {
    if (seenIds.has(ev.id)) continue;
    seenIds.add(ev.id);
    allEvents.push(ev);
  }

  // IPL 2026 from Cricbuzz
  for (const m of [...iplUpcoming, ...iplLive]) {
    const mi = m.matchInfo;
    if (!mi) continue;
    const startMs = parseInt(mi.startDate);
    const dateObj = new Date(startMs);
    const dateOnly = dateObj.toISOString().split("T")[0];
    const timeOnly = dateObj.toISOString().split("T")[1].replace("Z", "");
    if (!inWeek(dateOnly, start, end)) continue;
    const id = "ipl_" + mi.matchId;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const ist = toIST(dateOnly, timeOnly);
    allEvents.push({
      id, sport: "cricket",
      leagueName: "IPL 2026",
      homeTeam: mi.team1?.teamName || "TBD",
      awayTeam: mi.team2?.teamName || "TBD",
      venue: (mi.venueInfo?.ground || "") + (mi.venueInfo?.city ? ", " + mi.venueInfo.city : ""),
      dateIST: ist.date, timeIST: ist.time, rawIST: ist.raw,
      status: mi.status || mi.state || "Upcoming",
      homeScore: null, awayScore: null,
      season: "2026", round: mi.matchDesc || "",
    });
  }

  // CricAPI — all other cricket
  const allCricMatches = [...cricCurrent, ...cricMatches0, ...cricMatches1, ...cricMatches2];
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
