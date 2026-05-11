const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split("T")[0];
    
    const tsdbResponse = await fetch(`${TSDB_BASE}/eventsday.php?d=${today}`);
    const tsdbData = await tsdbResponse.json();
    
    res.status(200).json(tsdbData.events || []);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
