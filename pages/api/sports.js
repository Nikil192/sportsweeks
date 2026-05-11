k// 1. YOUR PERFECT EXISTING SETUP
const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

const LEAGUES = {
  cricket_icc_mens: { id: "4844", name: "ICC Men's Cricket", sport: "cricket" },
  cricket_icc_womens: { id: "4759", name: "ICC Women's Cricket", sport: "cricket" },
  cricket_ipl: { id: "4910", name: "IPL", sport: "cricket" },
  premier_league: { id: "4328", name: "Premier League", sport: "football" },
  la_liga: { id: "4335", name: "La Liga", sport: "football" },
  ucl: { id: "4480", name: "UEFA Champions League", sport: "football" },
  bundesliga: { id: "4331", name: "Bundesliga", sport: "football" },
  serie_a: { id: "4332", name: "Serie A", sport: "football" },
  mls: { id: "4346", name: "MLS", sport: "football" },
  f1: { id: "4370", name: "Formula 1", sport: "f1" },
  bwf: { id: "4855", name: "BWF World Tour", sport: "badminton" },
};

// 2. THE NEW CRICKET ADDITION
const CRICKET_API_BASE = "https://api.cricapi.com/v1/currentMatches";
const CRICKET_API_KEY = "a539af9a-6572-4111-9a4b-c23726cb1d2a";

export default async function handler(req, res) {
  try {
    // We use a localized date for India (IST) so the matches match your timezone
    const today = new Date().toLocaleDateString('en-CA'); // Formats to YYYY-MM-DD

    // --- FETCH FOOTBALL / F1 / BADMINTON (TheSportsDB) ---
    const tsdbResponse = await fetch(`${TSDB_BASE}/eventsday.php?d=${today}`);
    const tsdbData = await tsdbResponse.json();
    let existingMatches = tsdbData.events || [];

    // --- FETCH IPL / DOMESTIC (CricketData.org) ---
    const cricketResponse = await fetch(`${CRICKET_API_BASE}?apikey=${CRICKET_API_KEY}&offset=0`);
    const cricketResult = await cricketResponse.json();

    let cricketMatches = [];
    if (cricketResult.status === "success" && cricketResult.data) {
      cricketMatches = cricketResult.data
        .filter(match => {
          const name = match.name.toLowerCase();
          // This keeps only the matches you actually care about
          return name.includes("ipl") || 
                 name.includes("indian premier league") || 
                 name.includes("ranji") || 
                 name.includes("trophy") ||
                 name.includes("t20");
        })
        .map(match => ({
          idEvent: match.id,
          strEvent: match.name,
          strLeague: match.series || "Cricket",
          strTimestamp: match.dateTimeGMT,
          strStatus: match.status,
          strSport: "Cricket",
          strHomeTeam: match.teams[0],
          strAwayTeam: match.teams[1],
          strThumb: "", 
        }));
    }

    // 3. MERGE EVERYTHING
    // F1/Football comes first, Cricket gets added to the list
    const combinedData = [...existingMatches, ...cricketMatches];

    res.status(200).json(combinedData);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to load the perfect sports feed" });
  }
}
