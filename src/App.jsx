import "./App.css";
import { useEffect, useMemo, useState } from "react";
import LoginPage from "./LoginPage";
import LibraryCacheGame from "./LibraryCacheGame";
import SpellCounter from "./SpellCounter";
import NumberBaseDrill from "./NumberBaseDrill";
import {
  apiFetch,
  hasToken,
  clearToken,
  getStatsOverview,
  getRecentActivity,
  getGames,
} from "./api";

/* ─────────────────────────────────────────────────────────────
   STATIC CONFIG
   ───────────────────────────────────────────────────────────── */

// Maps backend game id -> the game component to render. Only entries listed
// here are actually playable in the frontend; everything else falls back to
// "Coming soon" treatment regardless of backend status.
const GAME_COMPONENTS = {
  cache: LibraryCacheGame,
  spell: SpellCounter,
  convert: NumberBaseDrill,
};

const AVATAR_PALETTE = [
  ["#63b3ed", "#b794f4"],
  ["#f6ad55", "#fc8181"],
  ["#68d391", "#4fd1c5"],
  ["#b794f4", "#f687b3"],
  ["#4fd1c5", "#63b3ed"],
  ["#f687b3", "#f6ad55"],
];

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "games", label: "Games" },
  { id: "progress", label: "Progress" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "activity", label: "Activity" },
];

/* ─────────────────────────────────────────────────────────────
   UTILITIES
   ───────────────────────────────────────────────────────────── */

function avatarGradient(name) {
  if (!name) return AVATAR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function formatRelativeTime(unixSec) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - unixSec);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatNumber(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

function rankMessage(rank, totalUsers) {
  if (!rank) return "";
  if (rank === 1) return "👑 You're leading the class.";
  if (rank <= 3) return "🥇 Top three. Keep pushing.";
  if (totalUsers && rank <= Math.ceil(totalUsers * 0.25))
    return "🚀 Top 25%. Great work.";
  return "Climb the leaderboard by replaying for a higher score.";
}

/* ─────────────────────────────────────────────────────────────
   SHARED COMPONENTS
   ───────────────────────────────────────────────────────────── */

function Avatar({ name, size = 28 }) {
  const [a, b] = avatarGradient(name);
  const initials = (name || "??").slice(0, 2).toUpperCase();
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials}
    </div>
  );
}

function NavBar({ currentView, onNavigate, isLoggedIn, user, onOpenAuth, onLogout }) {
  return (
    <nav>
      <div
        className="logo"
        onClick={() => onNavigate("home")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onNavigate("home")}
        style={{ cursor: "pointer" }}
      >
        <div className="logo-icon">Σ</div>
        <div>
          <div className="logo-text">Architects of Logic</div>
          <div className="logo-sub">CWU · Computer Architecture</div>
        </div>
      </div>

      <div className="nav-links">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            className={currentView === item.id ? "active" : ""}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="nav-right">
        {isLoggedIn ? (
          <>
            <div
              className="user-pill"
              onClick={() => onNavigate("progress")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("progress")}
              style={{ cursor: "pointer" }}
              title="View your progress"
            >
              <Avatar name={user?.username} size={26} />
              <span className="user-pill-name">@{user?.username}</span>
            </div>
            <button className="btn-outline" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button className="btn-outline" onClick={onOpenAuth}>
              Log in
            </button>
            <button className="btn-primary" onClick={onOpenAuth}>
              Get started
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-header fade-in">
      <div className="page-header-text">
        {eyebrow && <div className="hero-eyebrow">{eyebrow}</div>}
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PageShell({
  currentView,
  onNavigate,
  isLoggedIn,
  user,
  onOpenAuth,
  onLogout,
  children,
}) {
  return (
    <>
      <NavBar
        currentView={currentView}
        onNavigate={onNavigate}
        isLoggedIn={isLoggedIn}
        user={user}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />
      <div className="shell">
        {children}
        <footer>
          <div className="footer-left">
            © {new Date().getFullYear()} CWU · Architects of Logic
          </div>
          <div className="footer-right">
            Built for CS computer-architecture coursework
          </div>
        </footer>
      </div>
    </>
  );
}

function GameCard({ game, onClick }) {
  const playable =
    game.status === "playable" && Object.prototype.hasOwnProperty.call(GAME_COMPONENTS, game.id);
  const description = game.description || game.desc || "";

  const handleClick = () => {
    if (playable) onClick();
  };

  return (
    <div
      className={`game-showcase-card fade-in ${playable ? "" : "is-coming-soon"}`}
      style={{
        "--card-accent": game.color,
        "--card-dim": game.colorDim,
        "--card-border": game.colorBorder,
      }}
      onClick={handleClick}
      role={playable ? "button" : undefined}
      tabIndex={playable ? 0 : -1}
      onKeyDown={(e) => playable && e.key === "Enter" && onClick()}
      aria-disabled={!playable}
    >
      <div className="gsc-left">
        <div className="gsc-icon-wrap" style={{ background: game.colorDim }}>
          <span className="gsc-icon">{game.icon}</span>
        </div>
        <div className="gsc-body">
          <div className="gsc-tag" style={{ color: game.color }}>
            {game.tag}
          </div>
          <div className="gsc-title">{game.title}</div>
          <p className="gsc-desc">{description}</p>
          <div className="gsc-badges">
            {(game.badges || []).map((b) => (
              <span
                key={b}
                className="gsc-badge"
                style={{
                  background: game.colorDim,
                  color: "var(--text)",
                  borderColor: game.color,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
      {playable ? (
        <div className="gsc-play-btn" style={{ color: game.color }}>
          Play →
        </div>
      ) : (
        <div className="gsc-soon-badge">Coming soon</div>
      )}
    </div>
  );
}

function LeaderboardRow({ row, isMe }) {
  const podiumClass =
    row.rank === 1
      ? "podium-gold"
      : row.rank === 2
        ? "podium-silver"
        : row.rank === 3
          ? "podium-bronze"
          : "";
  const widthPct = `${Math.max(8, Math.round((row.totalXp / Math.max(row._top || row.totalXp, 1)) * 100))}%`;
  return (
    <div className={`lb-row ${podiumClass} ${isMe ? "is-me" : ""}`}>
      <div className="lb-rank">
        {row.rank === 1
          ? "🥇"
          : row.rank === 2
            ? "🥈"
            : row.rank === 3
              ? "🥉"
              : `#${row.rank}`}
      </div>
      <Avatar name={row.username} size={28} />
      <div className="lb-name">
        {row.username}
        {isMe && <span className="lb-you">YOU</span>}
      </div>
      <div className="lb-bar">
        <div className="lb-bar-fill" style={{ width: widthPct }} />
      </div>
      <div className="lb-score">{formatNumber(row.totalXp)}</div>
    </div>
  );
}

function ActivityRow({ row, isMe, gameMeta }) {
  const meta = gameMeta?.[row.gameId] || {
    label: row.gameId,
    icon: "🎮",
    color: "var(--text2)",
  };
  return (
    <div className={`activity-row ${isMe ? "is-me" : ""}`}>
      <Avatar name={row.username} size={32} />
      <div className="activity-body">
        <div className="activity-line">
          <span className="activity-name">@{row.username}</span>
          <span className="activity-verb">played</span>
          <span className="activity-game" style={{ color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          {isMe && <span className="lb-you">YOU</span>}
        </div>
        <div className="activity-meta">
          <span>+{formatNumber(row.xpEarned)} XP</span>
          <span>·</span>
          <span>{Math.round(row.accuracy * 100)}% accuracy</span>
          <span>·</span>
          <span>{formatRelativeTime(row.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGES
   ───────────────────────────────────────────────────────────── */

function HomePage({
  onNavigate,
  onGameClick,
  isLoggedIn,
  leaderboard,
  recentActivity,
  stats,
  games,
  gameMeta,
}) {
  const heroStats = stats
    ? [
        { num: formatNumber(stats.users), label: "Players" },
        { num: formatNumber(stats.plays), label: "Sessions" },
        { num: formatNumber(stats.totalXp), label: "XP Earned" },
      ]
    : null;

  const top3 = leaderboard.slice(0, 3).map((r) => ({
    ...r,
    _top: leaderboard[0]?.totalXp || 1,
  }));
  const activitySnippet = (recentActivity || []).slice(0, 4);

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="hero-left fade-in">
          <h1>
            Learn
            <br />
            Computer
            <br />
            Architecture.
          </h1>
          <p className="hero-desc">
            Two interactive games covering cache mapping and number systems —
            with pre/post assessments, bit-level scoring, and a live class
            leaderboard.
          </p>
          <div className="hero-cta">
            <button className="btn-primary btn-lg" onClick={() => onNavigate("games")}>
              Browse Games →
            </button>
            <button className="btn-outline btn-lg" onClick={() => onNavigate("leaderboard")}>
              View Leaderboard
            </button>
          </div>

          {heroStats ? (
            <div className="hero-stats">
              {heroStats.map((s) => (
                <div className="stat" key={s.label}>
                  <div className="stat-num">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="hero-stats">
              {[1, 2, 3].map((i) => (
                <div className="stat" key={i}>
                  <div className="stat-num skeleton-num">—</div>
                  <div className="stat-label">Loading…</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hero-visual fade-in">
          <div className="hero-card">
            <div className="hero-card-head">
              <span className="hero-card-eyebrow">Live · Top Scorer</span>
              <span
                className="hero-card-pulse"
                title="Updates whenever someone plays"
              />
            </div>
            {stats?.topScorer ? (
              <div className="hero-card-body">
                <Avatar name={stats.topScorer.username} size={56} />
                <div className="hero-card-name">@{stats.topScorer.username}</div>
                <div className="hero-card-xp">
                  {formatNumber(stats.topScorer.totalXp)} XP
                </div>
                <div className="hero-card-sub">
                  Avg accuracy ·{" "}
                  {stats.avgAccuracy != null
                    ? `${Math.round(stats.avgAccuracy * 100)}%`
                    : "—"}
                </div>
              </div>
            ) : (
              <div className="hero-card-body">
                <div className="hero-empty">
                  <div className="hero-empty-icon">🏁</div>
                  <div>No champions yet.</div>
                  <div className="hero-empty-sub">
                    First plays appear here in real time.
                  </div>
                </div>
              </div>
            )}
            <div className="hero-card-foot">
              <span className="hero-card-foot-num">
                {stats ? formatNumber(stats.plays) : "—"}
              </span>{" "}
              sessions · {stats ? formatNumber(stats.users) : "—"} learners
            </div>
          </div>
        </div>
      </div>

      {/* GAMES PREVIEW */}
      <div className="section-head">
        <span className="section-title">// Games</span>
        <div className="section-line" />
        <a className="section-cta" onClick={() => onNavigate("games")}>
          View all →
        </a>
      </div>
      <div className="games-showcase">
        {games.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => onGameClick(game.id)} />
        ))}
      </div>

      {/* PREVIEW: leaderboard + activity */}
      <div className="bottom-grid">
        <div className="bottom-section">
          <div className="section-head">
            <span className="section-title">// Top 3</span>
            <div className="section-line" />
            <a className="section-cta" onClick={() => onNavigate("leaderboard")}>
              Full board →
            </a>
          </div>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">CLASS LEADERBOARD</div>
              <div className="panel-meta">
                {stats ? `${formatNumber(stats.users)} learners` : ""}
              </div>
            </div>
            {top3.length === 0 && (
              <div className="panel-empty">
                <div className="panel-empty-icon">🏁</div>
                <div className="panel-empty-title">No scores yet</div>
                <div className="panel-empty-sub">
                  Be the first to place a book or counter a spell.
                </div>
              </div>
            )}
            {top3.map((r) => (
              <LeaderboardRow key={r.rank} row={r} isMe={false} />
            ))}
            {/* games preview list above already; gameMeta passed through */}
          </div>
        </div>

        <div className="bottom-section">
          <div className="section-head">
            <span className="section-title">// Recent</span>
            <div className="section-line" />
            <a className="section-cta" onClick={() => onNavigate("activity")}>
              All activity →
            </a>
          </div>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">LIVE FEED</div>
              <div className="panel-meta">Class-wide</div>
            </div>
            {activitySnippet.length === 0 && (
              <div className="panel-empty">
                <div className="panel-empty-icon">📭</div>
                <div className="panel-empty-title">No recent plays</div>
                <div className="panel-empty-sub">
                  Sessions appear here as classmates finish a game.
                </div>
              </div>
            )}
            {activitySnippet.map((row) => (
              <ActivityRow
                key={row.id}
                row={row}
                isMe={false}
                gameMeta={gameMeta}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CTA STRIP */}
      {!isLoggedIn && (
        <div className="cta-strip fade-in">
          <div className="cta-strip-text">
            <div className="cta-strip-eyebrow">Track your progress</div>
            <div className="cta-strip-title">
              Sign in to record XP, climb the rankings, and unlock pre/post tests.
            </div>
          </div>
          <button
            className="btn-primary btn-lg"
            onClick={() => onNavigate("auth")}
          >
            Create an account →
          </button>
        </div>
      )}
    </>
  );
}

function GamesPage({ games, onGameClick }) {
  const playableCount = games.filter((g) => g.status === "playable").length;
  const totalCount = games.length;
  return (
    <>
      <PageHeader
        title="Games"
        subtitle={`${playableCount} of ${totalCount} modules are live. Each game covers a core computer-architecture topic with bit-level scoring and instant feedback. More on the way.`}
      />
      <div className="games-showcase" style={{ marginBottom: 60 }}>
        {games.length === 0 && (
          <div className="panel-empty" style={{ padding: 60 }}>
            <div className="panel-empty-icon">⌛</div>
            <div className="panel-empty-title">Loading games…</div>
          </div>
        )}
        {games.map((game) => (
          <GameCard key={game.id} game={game} onClick={() => onGameClick(game.id)} />
        ))}
      </div>
    </>
  );
}

function ProgressPage({ isLoggedIn, user, progress, onOpenAuth, games, gameMeta }) {
  const totalXp = progress?.totalXp ?? 0;
  const userRank = progress?.rank;
  const totalUsers = progress?.totalUsers ?? 0;
  const playableGames = games.filter((g) => g.status === "playable");
  const perGame = progress?.perGame || {};
  const maxGameXp = Math.max(
    1,
    ...playableGames.map((g) => perGame[g.id]?.bestScore ?? 0),
  );

  return (
    <>
      <PageHeader
        eyebrow={isLoggedIn ? null : "Your account"}
        title="Your Progress"
        subtitle={
          isLoggedIn
            ? "Per-game best scores, total XP, and how you stack up against the class."
            : "Sign in to start tracking XP and accuracy across both games."
        }
      />

      <div className="panel" style={{ marginBottom: 60 }}>
        <div className="panel-head">
          <div className="panel-title">PROGRESS OVERVIEW</div>
          {isLoggedIn && (
            <div className="panel-meta">
              <span className="meta-num">{formatNumber(totalXp)}</span> XP total
            </div>
          )}
        </div>

        {!isLoggedIn ? (
          <div className="panel-empty">
            <div className="panel-empty-icon">🔒</div>
            <div className="panel-empty-title">Sign in to track XP</div>
            <div className="panel-empty-sub">
              Your scores, rank, and accuracy will appear here once you log in.
            </div>
            <button
              className="btn-primary"
              style={{ marginTop: 14 }}
              onClick={onOpenAuth}
            >
              Log in / Register
            </button>
          </div>
        ) : (
          <>
            {userRank && (
              <div className="rank-card">
                <div className="rank-card-left">
                  <div className="rank-badge">#{userRank}</div>
                  <div>
                    <div className="rank-card-title">
                      Class rank {userRank} of {totalUsers}
                    </div>
                    <div className="rank-card-sub">
                      {rankMessage(userRank, totalUsers)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {playableGames.map((game) => {
              const g = perGame[game.id];
              const xp = g?.bestScore ?? 0;
              const plays = g?.plays ?? 0;
              const acc = g?.accuracy ?? 0;
              const pct = `${Math.round((xp / maxGameXp) * 100)}%`;
              const meta = gameMeta?.[game.id];
              return (
                <div key={game.id} className="progress-row">
                  <div className="xp-row">
                    <span className="xp-label">
                      <span
                        className="xp-icon"
                        style={{ color: meta?.color || game.color }}
                      >
                        {meta?.icon || game.icon}
                      </span>
                      {meta?.label || game.title}
                    </span>
                    <span className="xp-val">{formatNumber(xp)} XP</span>
                  </div>
                  <div className="xp-track">
                    <div
                      className="xp-fill"
                      style={{
                        width: pct,
                        background: `linear-gradient(90deg, ${game.color}, var(--accent))`,
                      }}
                    />
                  </div>
                  <div className="xp-meta">
                    <span>{plays} plays</span>
                    <span>·</span>
                    <span>{Math.round(acc * 100)}% avg accuracy</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

function LeaderboardPage({ leaderboard, isLoggedIn, user, stats }) {
  const top = leaderboard[0]?.totalXp || 1;
  const decorated = leaderboard.map((r) => ({ ...r, _top: top }));
  const myEntry = isLoggedIn
    ? leaderboard.find((r) => r.username === user?.username)
    : null;

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle={`Top ${leaderboard.length || 20} players by total XP earned across both games.`}
        action={
          stats && (
            <div className="page-header-stat">
              <div className="stat-num">{formatNumber(stats.users)}</div>
              <div className="stat-label">Total players</div>
            </div>
          )
        }
      />

      {myEntry && (
        <div className="my-rank-callout">
          <div className="my-rank-left">
            <Avatar name={user?.username} size={36} />
            <div>
              <div className="my-rank-title">You're rank #{myEntry.rank}</div>
              <div className="my-rank-sub">{rankMessage(myEntry.rank, stats?.users)}</div>
            </div>
          </div>
          <div className="my-rank-xp">{formatNumber(myEntry.totalXp)} XP</div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 60 }}>
        <div className="panel-head">
          <div className="panel-title">FULL LEADERBOARD</div>
          <div className="panel-meta">
            {stats ? `${formatNumber(stats.plays)} sessions logged` : ""}
          </div>
        </div>
        {decorated.length === 0 && (
          <div className="panel-empty">
            <div className="panel-empty-icon">🏁</div>
            <div className="panel-empty-title">No scores yet</div>
            <div className="panel-empty-sub">
              Be the first to place a book or counter a spell.
            </div>
          </div>
        )}
        {decorated.map((r) => (
          <LeaderboardRow
            key={r.rank}
            row={r}
            isMe={isLoggedIn && user?.username === r.username}
          />
        ))}
      </div>
    </>
  );
}

function ActivityPage({ recentActivity, isLoggedIn, user, gameMeta }) {
  return (
    <>
      <PageHeader
        title="Activity Feed"
        subtitle="Every play across the class as it happens. Watch new sessions appear in real time."
      />

      <div className="panel activity-panel" style={{ marginBottom: 60 }}>
        <div className="panel-head">
          <div className="panel-title">RECENT SESSIONS</div>
          <div className="panel-meta">
            {recentActivity?.length ? `${recentActivity.length} most recent` : ""}
          </div>
        </div>

        {(!recentActivity || recentActivity.length === 0) && (
          <div className="panel-empty">
            <div className="panel-empty-icon">📭</div>
            <div className="panel-empty-title">No recent plays</div>
            <div className="panel-empty-sub">
              Sessions appear here as classmates finish a game.
            </div>
          </div>
        )}

        {recentActivity?.map((row) => (
          <ActivityRow
            key={row.id}
            row={row}
            isMe={isLoggedIn && user?.username === row.username}
            gameMeta={gameMeta}
          />
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   APP / ROUTING
   ───────────────────────────────────────────────────────────── */

function App() {
  const [view, setView] = useState("home");
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [games, setGames] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Hydrate session from token on mount
  useEffect(() => {
    if (!hasToken()) return;
    apiFetch("/auth/me")
      .then((u) => {
        setUser(u);
        setIsLoggedIn(true);
      })
      .catch(() => clearToken());
  }, []);

  // Game catalog — fetch once on mount; rarely changes
  useEffect(() => {
    getGames()
      .then((all) => setGames(all.filter((g) => g.status !== "coming_soon")))
      .catch(() => setGames([]));
  }, [refreshTick]);

  // Build a map: gameId -> { label, icon, color } for activity feed / progress rows
  const gameMeta = useMemo(() => {
    const m = {};
    for (const g of games) {
      m[g.id] = {
        label: g.tag || g.title,
        icon: g.icon,
        color: g.color,
      };
    }
    return m;
  }, [games]);

  const isPageView = ["home", "games", "progress", "leaderboard", "activity"].includes(view);

  // Site-wide stats — always available on any page view
  useEffect(() => {
    if (!isPageView) return;
    getStatsOverview()
      .then(setStats)
      .catch(() => setStats(null));
  }, [isPageView, refreshTick]);

  // Leaderboard — fetch larger limit for the dedicated page
  useEffect(() => {
    if (!isPageView) return;
    const limit = view === "leaderboard" ? 20 : 5;
    apiFetch(`/leaderboard?limit=${limit}`)
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]));
  }, [view, isPageView, refreshTick]);

  // Recent activity — fetch larger limit for the dedicated page
  useEffect(() => {
    if (!isPageView) return;
    const limit = view === "activity" ? 30 : 8;
    getRecentActivity(limit)
      .then(setRecentActivity)
      .catch(() => setRecentActivity([]));
  }, [view, isPageView, refreshTick]);

  // Personal progress — only when logged in and on a page that needs it
  useEffect(() => {
    if (!isPageView || !isLoggedIn) return;
    apiFetch("/progress/me")
      .then(setProgress)
      .catch(() => setProgress(null));
  }, [view, isPageView, isLoggedIn, refreshTick]);

  // Scroll to top on view change
  useEffect(() => {
    if (isPageView) window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, isPageView]);

  const handleNavigate = (next) => {
    if (next === "auth") {
      setView("auth");
      return;
    }
    setView(next);
    setSelectedGameId(null);
  };
  const goGame = (id) => {
    setSelectedGameId(id);
    setView("game");
  };
  const goAuth = () => setView("auth");
  const handleLoginSuccess = (u) => {
    setUser(u);
    setIsLoggedIn(true);
    setView("home");
    setRefreshTick((t) => t + 1);
  };
  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setUser(null);
    setProgress(null);
    setView("home");
    setSelectedGameId(null);
  };
  const goHomeFromGame = () => {
    setView("home");
    setSelectedGameId(null);
    setRefreshTick((t) => t + 1);
  };

  if (view === "auth") {
    return <LoginPage onBack={goHomeFromGame} onLoginSuccess={handleLoginSuccess} />;
  }

  if (view === "game") {
    const Component = GAME_COMPONENTS[selectedGameId];
    if (Component) {
      return <Component onBack={goHomeFromGame} onHome={goHomeFromGame} />;
    }
    // Unknown / not-yet-playable game id — fall back to home
  }

  let pageContent;
  if (view === "games") {
    pageContent = <GamesPage games={games} onGameClick={goGame} />;
  } else if (view === "progress") {
    pageContent = (
      <ProgressPage
        isLoggedIn={isLoggedIn}
        user={user}
        progress={progress}
        onOpenAuth={goAuth}
        games={games}
        gameMeta={gameMeta}
      />
    );
  } else if (view === "leaderboard") {
    pageContent = (
      <LeaderboardPage
        leaderboard={leaderboard}
        isLoggedIn={isLoggedIn}
        user={user}
        stats={stats}
      />
    );
  } else if (view === "activity") {
    pageContent = (
      <ActivityPage
        recentActivity={recentActivity}
        isLoggedIn={isLoggedIn}
        user={user}
        gameMeta={gameMeta}
      />
    );
  } else {
    pageContent = (
      <HomePage
        onNavigate={handleNavigate}
        onGameClick={goGame}
        isLoggedIn={isLoggedIn}
        leaderboard={leaderboard}
        recentActivity={recentActivity}
        stats={stats}
        games={games}
        gameMeta={gameMeta}
      />
    );
  }

  return (
    <PageShell
      currentView={view}
      onNavigate={handleNavigate}
      isLoggedIn={isLoggedIn}
      user={user}
      onOpenAuth={goAuth}
      onLogout={handleLogout}
    >
      {pageContent}
    </PageShell>
  );
}

export default App;
