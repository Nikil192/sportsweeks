import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const SPORTS = [
  { key: "all", label: "All Sports", emoji: "🏆", color: "#f59e0b" },
  { key: "cricket", label: "Cricket", emoji: "🏏", color: "#22c55e" },
  { key: "football", label: "Football", emoji: "⚽", color: "#3b82f6" },
  { key: "f1", label: "Formula 1", emoji: "🏎️", color: "#ef4444" },
  { key: "badminton", label: "Badminton", emoji: "🏸", color: "#a855f7" },
];

const SPORT_ICONS = {
  cricket: "🏏",
  football: "⚽",
  f1: "🏎️",
  badminton: "🏸",
};

const SPORT_COLORS = {
  cricket: { bg: "sport-cricket-bg", accent: "#22c55e", tag: "#166534" },
  football: { bg: "sport-football-bg", accent: "#3b82f6", tag: "#1e40af" },
  f1: { bg: "sport-f1-bg", accent: "#ef4444", tag: "#991b1b" },
  badminton: { bg: "sport-badminton-bg", accent: "#a855f7", tag: "#6b21a8" },
};

function getWeekLabel() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${now.getDate()} ${months[now.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

function EventCard({ event, dark }) {
  const sport = event.sport;
  const accentColor = SPORT_COLORS[sport]?.accent || "#f59e0b";
  const isLive = event.status === "Match Finished" || event.status === "FT";
  const hasScore = event.homeScore !== null && event.awayScore !== null;

  return (
    <div className={`event-card ${dark ? "dark" : ""}`} style={{ "--accent": accentColor }}>
      <div className="event-card-top">
        <span className="league-badge">{SPORT_ICONS[sport]} {event.leagueName}</span>
        {event.round ? <span className="round-badge">R{event.round}</span> : null}
        {isLive && hasScore ? (
          <span className="status-badge finished">FT</span>
        ) : (
          <span className="status-badge upcoming">Upcoming</span>
        )}
      </div>

      <div className="event-teams">
        <div className="team home">
          <span className="team-name">{event.homeTeam}</span>
          {hasScore && <span className="score">{event.homeScore}</span>}
        </div>
        <div className="vs-divider">
          {hasScore ? <span className="score-dash">–</span> : <span className="vs">VS</span>}
        </div>
        <div className="team away">
          {hasScore && <span className="score">{event.awayScore}</span>}
          <span className="team-name">{event.awayTeam}</span>
        </div>
      </div>

      <div className="event-meta">
        <div className="meta-item">
          <span className="meta-icon">📅</span>
          <span>{event.dateIST}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">🕐</span>
          <span>{event.timeIST}</span>
        </div>
        {event.venue && (
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span className="venue">{event.venue}</span>
          </div>
        )}
      </div>

      <div className="event-accent-bar" style={{ background: accentColor }} />
    </div>
  );
}

function SportSection({ sportKey, events, dark, loading }) {
  const sport = SPORTS.find((s) => s.key === sportKey);
  const color = sport?.color || "#f59e0b";

  return (
    <section className={`sport-section ${dark ? "dark" : ""}`}>
      <div className="section-header">
        <span className="section-emoji">{sport?.emoji}</span>
        <h2 className="section-title" style={{ color }}>{sport?.label}</h2>
        <span className="match-count" style={{ background: color }}>
          {loading ? "…" : `${events.length} match${events.length !== 1 ? "es" : ""}`}
        </span>
      </div>

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map((i) => <div key={i} className={`skeleton-card ${dark ? "dark" : ""}`} />)}
        </div>
      ) : events.length === 0 ? (
        <div className={`no-matches ${dark ? "dark" : ""}`}>
          <span className="no-matches-emoji">😴</span>
          <p>No matches this week</p>
          <small>Check back later for upcoming {sport?.label} fixtures</small>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((ev) => <EventCard key={ev.id} event={ev} dark={dark} />)}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [dark, setDark] = useState(false);
  const [selectedSport, setSelectedSport] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Dark mode preference
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDark(true);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setDark(true);

    // Offline detection
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sports");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      // Cache in localStorage for offline
      localStorage.setItem("sports_cache", JSON.stringify({ ...json, cachedAt: Date.now() }));
    } catch (err) {
      // Try cache
      const cached = localStorage.getItem("sports_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setLastUpdated("cached");
        setError("Using offline data");
      } else {
        setError("Could not load data. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const events = data?.events || {};
  const sportsToShow = selectedSport === "all"
    ? ["cricket", "football", "f1", "badminton"]
    : [selectedSport];

  return (
    <>
      <Head>
        <title>Weekly Sports Schedule 🏆</title>
        <meta name="description" content="Your weekly sports schedule - Cricket, Football, F1, Badminton in IST" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={dark ? "#0f172a" : "#f8fafc"} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet" />
      </Head>

      <div className={`app ${dark ? "dark" : "light"}`}>
        {/* Header */}
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-icon">⚡</span>
              <div>
                <h1 className="logo-title">SportWeek</h1>
                <p className="logo-sub">{getWeekLabel()}</p>
              </div>
            </div>

            <div className="header-actions">
              {offline && <span className="offline-badge">📡 Offline</span>}
              {lastUpdated && (
                <span className="updated-badge">
                  {lastUpdated === "cached" ? "📦 Cached" : `🔄 ${lastUpdated}`}
                </span>
              )}
              <button className="refresh-btn" onClick={fetchData} disabled={loading}>
                {loading ? "⏳" : "🔄"}
              </button>
              <button
                className="theme-toggle"
                onClick={() => setDark((d) => !d)}
                aria-label="Toggle theme"
              >
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </header>

        {/* Sport Filter */}
        <div className="filter-bar">
          <div className="filter-inner">
            {SPORTS.map((s) => (
              <button
                key={s.key}
                className={`filter-btn ${selectedSport === s.key ? "active" : ""}`}
                style={selectedSport === s.key ? { "--btn-color": s.color } : {}}
                onClick={() => setSelectedSport(s.key)}
              >
                <span className="filter-emoji">{s.emoji}</span>
                <span className="filter-label">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Main Content */}
        <main className="main">
          {sportsToShow.map((sportKey) => (
            <SportSection
              key={sportKey}
              sportKey={sportKey}
              events={events[sportKey] || []}
              dark={dark}
              loading={loading}
            />
          ))}
        </main>

        {/* Footer */}
        <footer className="footer">
          <p>All times shown in <strong>Indian Standard Time (IST)</strong> · Data via TheSportsDB</p>
          <p>Works offline · Updates every hour</p>
        </footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --radius: 16px;
          --radius-sm: 10px;
          --shadow: 0 4px 24px rgba(0,0,0,0.08);
          --shadow-dark: 0 4px 24px rgba(0,0,0,0.3);
        }

        body { font-family: var(--font-body); }

        .app.light {
          --bg: #f0f4f8;
          --bg2: #ffffff;
          --bg3: #e8edf3;
          --text: #0f172a;
          --text2: #475569;
          --text3: #94a3b8;
          --border: #e2e8f0;
          --card-bg: #ffffff;
          --header-bg: rgba(248,250,252,0.92);
          --filter-bg: rgba(248,250,252,0.95);
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          transition: background 0.3s, color 0.3s;
        }

        .app.dark {
          --bg: #070b14;
          --bg2: #0f1729;
          --bg3: #1a2540;
          --text: #f1f5f9;
          --text2: #94a3b8;
          --text3: #475569;
          --border: #1e293b;
          --card-bg: #0f1a2e;
          --header-bg: rgba(7,11,20,0.94);
          --filter-bg: rgba(7,11,20,0.97);
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          transition: background 0.3s, color 0.3s;
        }

        /* Header */
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--header-bg);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          padding: 0 20px;
        }

        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo { display: flex; align-items: center; gap: 12px; }

        .logo-icon {
          font-size: 28px;
          filter: drop-shadow(0 0 8px rgba(245,158,11,0.6));
        }

        .logo-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--text);
          line-height: 1.1;
        }

        .logo-sub {
          font-size: 11px;
          color: var(--text2);
          font-weight: 400;
          letter-spacing: 0.5px;
        }

        .header-actions { display: flex; align-items: center; gap: 8px; }

        .offline-badge, .updated-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          background: var(--bg3);
          color: var(--text2);
        }

        .offline-badge { background: #fee2e2; color: #ef4444; }

        .refresh-btn, .theme-toggle {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--bg2);
          cursor: pointer;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }

        .refresh-btn:hover, .theme-toggle:hover {
          transform: scale(1.08);
          background: var(--bg3);
        }

        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Filter Bar */
        .filter-bar {
          position: sticky;
          top: 68px;
          z-index: 90;
          background: var(--filter-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          padding: 10px 20px;
        }

        .filter-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .filter-inner::-webkit-scrollbar { display: none; }

        .filter-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 50px;
          border: 1.5px solid var(--border);
          background: var(--bg2);
          color: var(--text2);
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .filter-btn:hover { border-color: var(--btn-color, #f59e0b); color: var(--text); }

        .filter-btn.active {
          background: var(--btn-color, #f59e0b);
          border-color: var(--btn-color, #f59e0b);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--btn-color, #f59e0b) 40%, transparent);
        }

        .filter-emoji { font-size: 15px; }
        .filter-label {}

        /* Error Banner */
        .error-banner {
          max-width: 1200px;
          margin: 12px auto;
          padding: 10px 20px;
          background: #fff3cd;
          color: #92400e;
          border-radius: var(--radius-sm);
          font-size: 13px;
          border: 1px solid #fbbf24;
        }

        /* Main */
        .main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        /* Sport Section */
        .sport-section { }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .section-emoji { font-size: 26px; }

        .section-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .match-count {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          color: white;
          letter-spacing: 0.5px;
        }

        /* Events Grid */
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        /* Event Card */
        .event-card {
          position: relative;
          background: var(--card-bg);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          padding: 16px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: var(--shadow);
        }

        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }

        .app.dark .event-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        .event-accent-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          opacity: 0.7;
        }

        .event-card-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .league-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--text2);
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .round-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--bg3);
          color: var(--text2);
        }

        .status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }

        .status-badge.finished { background: #dcfce7; color: #166534; }
        .status-badge.upcoming { background: #dbeafe; color: #1e40af; }
        .app.dark .status-badge.finished { background: #14532d; color: #86efac; }
        .app.dark .status-badge.upcoming { background: #1e3a5f; color: #93c5fd; }

        .event-teams {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .team {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .team.home { justify-content: flex-start; }
        .team.away { justify-content: flex-end; }

        .team-name {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }

        .score {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 800;
          color: var(--accent, #f59e0b);
        }

        .vs-divider {
          flex-shrink: 0;
          width: 32px;
          text-align: center;
        }

        .vs {
          font-size: 10px;
          font-weight: 800;
          color: var(--text3);
          letter-spacing: 1px;
        }

        .score-dash {
          font-size: 16px;
          font-weight: 800;
          color: var(--text3);
        }

        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text2);
        }

        .meta-icon { font-size: 12px; flex-shrink: 0; }

        .venue {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* No Matches */
        .no-matches {
          background: var(--bg2);
          border: 1.5px dashed var(--border);
          border-radius: var(--radius);
          padding: 36px 24px;
          text-align: center;
        }

        .no-matches-emoji { font-size: 36px; display: block; margin-bottom: 10px; }

        .no-matches p {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .no-matches small { font-size: 12px; color: var(--text3); }

        /* Skeleton */
        .loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        .skeleton-card {
          height: 160px;
          border-radius: var(--radius);
          background: linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%);
          background-size: 800px 100%;
          animation: shimmer 1.5s infinite;
        }

        /* Footer */
        .footer {
          text-align: center;
          padding: 24px 20px;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--text3);
          line-height: 1.8;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .logo-title { font-size: 18px; }
          .logo-sub { display: none; }
          .updated-badge { display: none; }
          .events-grid { grid-template-columns: 1fr; }
          .team-name { font-size: 12px; }
        }
      `}</style>
    </>
  );
}
