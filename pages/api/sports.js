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

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const tsdbResponse = await fetch(`${TSDB_BASE}/eventsday.php?d=${today}`);
    const tsdbData = await tsdbResponse.json();
    
    res.status(200).json(tsdbData.events || []);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
