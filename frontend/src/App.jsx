import "./App.css";
import { useEffect, useState, useCallback } from "react";
import LoginPage from "./LoginPage";
import LibraryCacheGame from "./LibraryCacheGame";
import PreAssessment from "./PreAssessment";
import { apiFetch, hasToken, clearToken, getStatsOverview, getRecentActivity, postProgress, getAssessmentResults } from "./api";
import { MODE_DESCRIPTIONS } from "./GameConfigs";
const MODES = Object.values(MODE_DESCRIPTIONS);

/* ─── AVATAR ─────────────────────────────────────────── */
const PALETTE = [
  "#0057ff","#8b5cf6","#47a201","#f59e0b","#ef4444","#06b6d4","#f97316","#ec4899",
];
function avatarColor(name) {
  if (!name) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function initials(name) { return (name || "??").slice(0, 2).toUpperCase(); }

function Avatar({ name, size = 28 }) {
  return (
    <div className="bw-lb-avatar" style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}

/* ─── DUMMY LEADERBOARD / ACTIVITY DATA ──────────────── */
const DUMMY_LB = [
  { rank: 1, username: "alex_k",  totalXp: 8240 },
  { rank: 2, username: "maya_r",  totalXp: 6420 },
  { rank: 3, username: "j_liu",   totalXp: 5010 },
];
const DUMMY_ACT = [
  { id: 1, username: "alex_k",  modeLabel: "Direct Mapping",     xpEarned: 420, accuracy: .96, ts: 120  },
  { id: 2, username: "maya_r",  modeLabel: "Set-Associative",    xpEarned: 310, accuracy: .88, ts: 840  },
  { id: 3, username: "j_liu",   modeLabel: "Direct Mapping",     xpEarned: 280, accuracy: .82, ts: 1860 },
];

function fmtTime(secsAgo) {
  if (secsAgo < 60)   return `${secsAgo}s ago`;
  if (secsAgo < 3600) return `${Math.floor(secsAgo / 60)}m ago`;
  return `${Math.floor(secsAgo / 3600)}h ago`;
}
function fmtNum(n) { return typeof n === "number" ? n.toLocaleString() : "—"; }

/* ═══════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [view,       setView]       = useState("home");
  const [activeMode, setActiveMode] = useState(null);

  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user,       setUser]       = useState(null);

  // Remote public data
  const [stats,    setStats]    = useState(null);
  const [lbRows,   setLbRows]   = useState(DUMMY_LB);
  const [activity, setActivity] = useState(DUMMY_ACT);

  // User progress — all sourced from MongoDB via backend
  const [preScore,      setPreScore]      = useState(null);
  const [postScore,     setPostScore]     = useState(null);
  const [modeProgress,  setModeProgress]  = useState({});
  const [totalXp,       setTotalXp]       = useState(0);
  const [userRank,      setUserRank]      = useState(null);

  const preDone         = preScore  !== null;
  const postDone        = postScore !== null;
  const allModesComplete = MODES.every(m => modeProgress[m.id]?.complete);

  // User-specific stats derived from modeProgress
  const userPlays = Object.values(modeProgress).reduce((s, m) => s + (m.plays || 0), 0);
  const userAccuracy = (() => {
    const played = Object.values(modeProgress).filter(m => (m.plays || 0) > 0);
    if (!played.length) return null;
    return played.reduce((s, m) => s + (m.accuracy || 0), 0) / played.length;
  })();

  // Load user-specific data from backend
  const loadUserData = useCallback(async () => {
    if (!hasToken()) return;
    const [assessment, progress] = await Promise.all([
      getAssessmentResults(),
      apiFetch("/progress/me").catch(() => null),
    ]);
    if (assessment) {
      setPreScore(assessment.pre?.score  ?? null);
      setPostScore(assessment.post?.score ?? null);
    }
    if (progress) {
      setModeProgress(progress.perMode || {});
      setTotalXp(progress.totalXp || 0);
      setUserRank(progress.rank   || null);
    }
  }, []);

  // Auth check on mount
  useEffect(() => {
    if (!hasToken()) return;
    apiFetch("/auth/me")
      .then(u => { setUser(u); setIsLoggedIn(true); loadUserData(); })
      .catch(() => clearToken());
  }, [loadUserData]);

  // Public stats + leaderboard + activity
  const loadAll = useCallback(() => {
    return Promise.all([
      getStatsOverview().then(setStats).catch(() => {}),
      apiFetch("/leaderboard?limit=5").then(rows => { if (rows?.length) setLbRows(rows); }).catch(() => {}),
      getRecentActivity(5).then(rows => { if (rows?.length) setActivity(rows); }).catch(() => {}),
      loadUserData(),
    ]);
  }, [loadUserData]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Mode unlock logic — previous mode must have best accuracy >= 80%
  const UNLOCK_THRESHOLD = 0.8;
  const prevModeId = (modeId) => {
    const idx = MODES.findIndex(m => m.id === modeId);
    return idx > 0 ? MODES[idx - 1].id : null;
  };
  const modeUnlocked = (modeId) => {
    if (!preDone) return false;
    const prev = prevModeId(modeId);
    if (!prev) return true; // first mode always unlocked after pre-assessment
    return (modeProgress[prev]?.accuracy ?? 0) >= UNLOCK_THRESHOLD;
  };

  const handleGameFinish = async (modeId, score, accuracy) => {
    await postProgress({ gameId: "cache", modeId, score, accuracy, xpEarned: score });
    await loadAll();
    setView("home");
    setActiveMode(null);
  };

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setUser(null);
    setPreScore(null);
    setPostScore(null);
    setModeProgress({});
    setTotalXp(0);
    setUserRank(null);
    setView("home");
  };

  /* ── PRE-TEST VIEW ── */
  if (view === "pretest") {
    return (
      <PreAssessment
        type="pre"
        onBack={() => setView("home")}
        onComplete={async () => { await loadUserData(); setView("home"); }}
      />
    );
  }

  /* ── POST-TEST VIEW ── */
  if (view === "posttest") {
    return (
      <PreAssessment
        type="post"
        onBack={() => setView("home")}
        onComplete={async () => { await loadUserData(); setView("home"); }}
      />
    );
  }

  /* ── GAME VIEW ── */
  if (view === "game" && activeMode) {
    return (
      <LibraryCacheGame
        initialMode={activeMode}
        onBack={() => { setView("home"); setActiveMode(null); }}
        onHome={() => { setView("home"); setActiveMode(null); }}
        onComplete={(score, accuracy) => handleGameFinish(activeMode, score, accuracy)}
      />
    );
  }

  /* ── AUTH VIEW ── */
  if (view === "auth") {
    return (
      <LoginPage
        onBack={() => setView("home")}
        onLoginSuccess={(u) => {
          setPreScore(null); setPostScore(null);
          setModeProgress({}); setTotalXp(0); setUserRank(null);
          setUser(u); setIsLoggedIn(true);
          loadUserData();
          setView("home");
        }}
      />
    );
  }

  /* ── HOME VIEW ── */
  const top1Xp  = lbRows[0]?.totalXp || 1;
  const myLbRow = isLoggedIn ? lbRows.find(r => r.username === user?.username) : null;

  return (
    <>
      {/* NAV */}
      <nav className="bw-nav">
        <div className="bw-logo">
          <div className="bw-logo-icon">⚡</div>
          <div>
            <div className="bw-logo-name">Bitwise</div>
            <div className="bw-logo-sub">CWU · Computer Architecture</div>
          </div>
        </div>
        <div className="bw-nav-right">
          {isLoggedIn ? (
            <>
              {totalXp > 0 && (
                <div className="bw-nav-pill bw-nav-pill-xp">⭐ {fmtNum(totalXp)} XP</div>
              )}
              <div className="bw-user-pill">
                <div className="bw-user-avatar" style={{ background: avatarColor(user?.username) }}>
                  {initials(user?.username)}
                </div>
                <span className="bw-user-name">@{user?.username}</span>
              </div>
              <button className="bw-btn bw-btn-outline" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <button className="bw-btn bw-btn-outline" onClick={() => setView("auth")}>Log in</button>
            </>
          )}
        </div>
      </nav>

      <main className="bw-page">

        {/* HERO */}
        <div className="bw-hero">
          <div>
            <h1>Learn cache mapping.<br />By actually doing it.</h1>
            <p>Take a short pre-assessment, then play through three cache mapping modes — <b>direct</b>, <b>set-associative</b>, and <b>fully associative</b>. Retake the quiz after to see how much you learned.</p>
            <div className="bw-hero-btns">
              {!preDone
                ? <button className="bw-btn-hero-white" onClick={() => isLoggedIn ? setView("pretest") : setView("auth")}>
                    {isLoggedIn ? "Take Pre-Assessment →" : "Log in to Start →"}
                  </button>
                : <button className="bw-btn-hero-white" onClick={() => {
                    const m = MODES.find(m => modeUnlocked(m.id) && !modeProgress[m.id]?.complete);
                    if (m) { setActiveMode(m.id); setView("game"); }
                  }}>
                    {allModesComplete ? "Replay a Mode →" : "Continue Playing →"}
                  </button>
              }
              <button className="bw-btn-hero-outline" onClick={() => document.getElementById("bw-lb")?.scrollIntoView({ behavior: "smooth" })}>
                View Leaderboard
              </button>
            </div>
          </div>
          <div className="bw-hero-icon">🖥️</div>
        </div>

        {/* HOW IT WORKS */}
        <div className="bw-section-head" style={{ marginBottom: 12 }}>
          <div className="bw-section-title">How Bitwise works</div>
        </div>
        <div className="bw-how-grid">
          <div className="bw-how-card">
            <div className="bw-how-icon" style={{ background: "#fef3c7", borderColor: "#fbbf24" }}>📋</div>
            <div className="bw-how-title">1. Pre-Assessment</div>
            <div className="bw-how-desc">A short quiz measuring what you already know about cache mapping. Your score is saved for comparison.</div>
          </div>
          <div className="bw-how-card">
            <div className="bw-how-icon" style={{ background: "#f0fdf4", borderColor: "#06a342" }}>🎮</div>
            <div className="bw-how-title">2. Play the Game</div>
            <div className="bw-how-desc">Work through three cache mapping modes — direct, set-associative, and fully associative. Learn by doing.</div>
          </div>
          <div className="bw-how-card">
            <div className="bw-how-icon" style={{ background: "#eff6ff", borderColor: "#93c5fd" }}>🏆</div>
            <div className="bw-how-title">3. Post-Assessment</div>
            <div className="bw-how-desc">Retake the same quiz after playing. Compare your scores to see exactly how much the game taught you.</div>
          </div>
        </div>

        {/* STEP 1 — PRE-ASSESSMENT */}
        <div className="bw-step-row">
          <div className={`bw-step-num ${preDone ? "bw-step-num-done" : "bw-step-num-active"}`}>
            {preDone ? "✓" : "1"}
          </div>
          <div className={`bw-step-label ${preDone ? "bw-step-label-done" : "bw-step-label-active"}`}>
            {preDone ? "Pre-assessment Complete!" : "Start Here — Take the Pre-Assessment"}
          </div>
        </div>

        {preDone ? (
          <div className="bw-pre-done">
            <div className="bw-pre-done-icon">✅</div>
            <div>
              <div className="bw-pre-done-text">Pre-Assessment Complete — {preScore}/10</div>
              <div className="bw-pre-done-sub">Games are unlocked. Complete all three modes to unlock the post-assessment.</div>
            </div>
          </div>
        ) : (
          <div className="bw-pre-banner">
            <div className="bw-pre-icon">📋</div>
            <div className="bw-pre-body">
              <div className="bw-pre-title">Pre-Assessment — 10 questions · ~5 min</div>
              <div className="bw-pre-sub">Tests your existing knowledge of cache mapping. Your score is saved and compared to your post-assessment after playing — so you can see exactly how much you learned.</div>
            </div>
            <button className="bw-btn-pre" onClick={() => isLoggedIn ? setView("pretest") : setView("auth")}>
              {isLoggedIn ? "Start Quiz →" : "Log in to Start →"}
            </button>
          </div>
        )}

        {/* STEP 2 — GAME MODES */}
        <div className="bw-step-row">
          <div className={`bw-step-num ${preDone ? "bw-step-num-active" : "bw-step-num-locked"}`}>2</div>
          <div className={`bw-step-label ${preDone ? "bw-step-label-active" : "bw-step-label-locked"}`}>
            Play the Game — Three Cache Mapping Modes
            {preDone && <span style={{ fontSize: 15, color: "#9ca3af", fontWeight: 400, marginLeft: 8 }}>Complete in order to unlock the next</span>}
          </div>
        </div>

        <div className="bw-mode-grid">
          {MODES.map((mode) => {
            const unlocked = modeUnlocked(mode.id);
            const prog     = modeProgress[mode.id];
            const done     = !!prog?.complete;
            return (
              <div
                key={mode.id}
                className={`bw-mode-card ${!unlocked ? "bw-mode-locked" : ""}`}
                style={{ background: mode.colorLight, borderColor: mode.colorBorder }}
              >
                <div className="bw-mode-badge" style={{ color: mode.color, borderColor: mode.colorBorder, background: "#fff" }}>
                  {done ? "✓ " : ""}{mode.tag}
                </div>
                <div className="bw-mode-title" style={{ color: mode.colorDark }}>{mode.label}</div>
                <div className="bw-mode-desc"  style={{ color: mode.colorDark, opacity: .75 }}>{mode.desc}</div>
                
                <div className="bw-mode-bits">
                  {mode.bits.map((r) => (
                    <div key={r.part} className="bw-mode-bit-row">
                      <span className={`bw-bit-badge bw-bit-${r.part}`}>{r.part}</span>
                      <span style={{ color: mode.colorDark, opacity: .7 }}>{r.role}</span>
                    </div>
                  ))}
                </div>
                {unlocked ? (
                  <button
                    className="bw-mode-play-btn"
                    style={{ background: mode.color }}
                    onClick={() => { setActiveMode(mode.id); setView("game"); }}
                  >
                    {done ? "↺ Replay" : "▶ Play now"}
                  </button>
                ) : (() => {
                  const prev = prevModeId(mode.id);
                  const prevCfg = MODES.find(m => m.id === prev);
                  const prevAcc = modeProgress[prev]?.accuracy ?? null;
                  const played  = prevAcc !== null;
                  return (
                    <div className="bw-mode-lock-btn" style={{ borderColor: mode.colorBorder, color: mode.color, flexDirection: "column", gap: 8 }}>
                      <span>
                        🔒 {played
                          ? `Score 80%+ in ${prevCfg?.label} to unlock — best: ${Math.round(prevAcc * 100)}%`
                          : `Complete ${prevCfg?.label ?? "the Pre-Assessment"} first`}
                      </span>
                      {played && (
                        <button
                          className="bw-mode-play-btn"
                          style={{ background: prevCfg?.color, fontSize: 12, padding: "7px 0" }}
                          onClick={() => { setActiveMode(prev); setView("game"); }}
                        >
                          ↺ Retry {prevCfg?.label}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* STEP 3 — POST-ASSESSMENT */}
        <div className="bw-step-row">
          <div className={`bw-step-num ${postDone ? "bw-step-num-done" : "bw-step-num-locked"}`}>
            {postDone ? "✓" : "3"}
          </div>
          <div className={`bw-step-label ${postDone ? "bw-step-label-done" : "bw-step-label-locked"}`}>
            Post-Assessment — {postDone ? "Complete!" : allModesComplete ? "Ready to Take!" : "Unlocks After Completing All Three Modes"}
          </div>
        </div>

        <div className="bw-post-strip" style={{ opacity: allModesComplete ? 1 : .65 }}>
          <div className="bw-post-strip-icon">🏆</div>
          <div className="bw-post-strip-body">
            <div className="bw-post-strip-title">
              {postDone ? "Post-Assessment Complete!" : "Post-Assessment"}
            </div>
            <div className="bw-post-strip-sub">
              {postDone
                ? `You scored ${postScore}/10 — compare with your pre-assessment score of ${preScore}/10`
                : "Retake the same quiz after playing — your improvement score shows exactly what the game taught you"}
            </div>
          </div>
          {allModesComplete && !postDone
            ? <button className="bw-btn-pre" onClick={() => setView("posttest")}>Start →</button>
            : <div className="bw-post-strip-badge">
                {postDone ? `+${postScore - preScore} improvement` : allModesComplete ? "Ready!" : `${Object.keys(modeProgress).filter(k => modeProgress[k]?.complete).length} of 3 done`}
              </div>
          }
        </div>

        {/* PROGRESS (only when logged in with data) */}
        {isLoggedIn && (preDone || Object.keys(modeProgress).length > 0) && (
          <>
            <div className="bw-progress-title">Your progress</div>

            {/* STATS */}
            <div className="bw-stat-row">
              <div className="bw-stat-chip">
                <div className="bw-stat-chip-icon">🎮</div>
                <div className="bw-stat-chip-val">{fmtNum(userPlays)}</div>
                <div className="bw-stat-chip-lbl">Games Played</div>
              </div>
              <div className="bw-stat-chip">
                <div className="bw-stat-chip-icon">⭐</div>
                <div className="bw-stat-chip-val">{fmtNum(totalXp)}</div>
                <div className="bw-stat-chip-lbl">XP Earned</div>
              </div>
              <div className="bw-stat-chip">
                <div className="bw-stat-chip-icon">🎯</div>
                <div className="bw-stat-chip-val">{userAccuracy != null ? `${Math.round(userAccuracy * 100)}%` : "—"}</div>
                <div className="bw-stat-chip-lbl">Avg Accuracy</div>
              </div>
            </div>

            {/* Rank hero */}
            {userRank && (
              <div className="bw-rank-hero">
                <div className="bw-rank-box">
                  <div className="bw-rank-num">#{userRank}</div>
                  <div className="bw-rank-lbl">RANK</div>
                </div>
                <div className="bw-rank-text">
                  <div className="bw-rank-title">You're rank #{userRank}!</div>
                  <div className="bw-rank-sub">
                    {userRank === 1
                      ? "👑 You're leading the class."
                      : myLbRow
                        ? `${fmtNum((lbRows[myLbRow.rank - 2]?.totalXp ?? 0) - totalXp)} XP from rank #${userRank - 1}.`
                        : "Keep playing to climb the leaderboard!"}
                  </div>
                </div>
                <button className="bw-btn-keep-playing" onClick={() => {
                  const m = MODES.find(m => modeUnlocked(m.id) && !modeProgress[m.id]?.complete);
                  if (m) { setActiveMode(m.id); setView("game"); }
                }}>
                  Keep playing →
                </button>
              </div>
            )}

            {/* Assessment comparison */}
            {(preDone || postDone) && (
              <div className="bw-assess-row">
                <div className="bw-assess-cell">
                  <div className="bw-assess-lbl">📋 Pre-Assessment</div>
                  <div className="bw-assess-val" style={{ color: "#f59e0b" }}>{preScore !== null ? `${preScore}/10` : "—"}</div>
                  <div className="bw-assess-sub">{preDone ? "Completed" : "Not taken"}</div>
                </div>
                <div className="bw-assess-cell" style={{ background: "#f9fafb" }}>
                  <div className="bw-assess-lbl">🎮 Modes Done</div>
                  <div className="bw-assess-val" style={{ color: "#8b5cf6" }}>
                    {Object.values(modeProgress).filter(m => m?.complete).length} / 3
                  </div>
                  <div className="bw-assess-sub">{totalXp > 0 ? `${fmtNum(totalXp)} XP total` : "Not started"}</div>
                </div>
                <div className="bw-assess-cell" style={{ opacity: postDone ? 1 : .5 }}>
                  <div className="bw-assess-lbl">🏆 Post-Assessment</div>
                  <div className="bw-assess-val" style={{ color: "#22c55e" }}>{postScore !== null ? `${postScore}/10` : "—"}</div>
                  <div className="bw-assess-sub">{postDone ? "Completed" : "Not yet unlocked"}</div>
                </div>
                {postDone && preScore !== null && (
                  <div className="bw-assess-improvement" style={{ gridColumn: "1/-1" }}>
                    📈 You improved by {postScore - preScore} points after playing the games. Great work!
                  </div>
                )}
              </div>
            )}

            {/* Per-mode scores */}
            {Object.keys(modeProgress).length > 0 && (
              <div className="bw-mode-prog-card">
                {MODES.map(mode => {
                  const prog = modeProgress[mode.id];
                  if (!prog) return null;
                  const pct = Math.min(100, Math.round((prog.bestXp || 0) / mode.maxXp * 100));
                  return (
                    <div key={mode.id} className="bw-mode-prog-row">
                      <div className="bw-mp-top">
                        <div className="bw-mp-icon" style={{ background: mode.colorLight, borderColor: mode.colorBorder }}>
                          {mode.id === "direct" ? "🗂️" : mode.id === "set" ? "📚" : "🔓"}
                        </div>
                        <div className="bw-mp-info">
                          <div className="bw-mp-title">{mode.label}</div>
                          <div className="bw-mp-sub">{prog.plays || 0} plays · Best Score Counts</div>
                        </div>
                        <div className="bw-mp-score">
                          <div className="bw-mp-xp" style={{ color: mode.color }}>{fmtNum(prog.bestXp || 0)} XP</div>
                          <div className="bw-mp-xp-sub">Best Run</div>
                        </div>
                      </div>
                      <div className="bw-mp-track">
                        <div className="bw-mp-fill" style={{ width: `${pct}%`, background: mode.color }} />
                      </div>
                      <div className="bw-mp-meta">
                        <span className="bw-mp-badge" style={{ background: mode.colorLight, color: mode.colorDark, borderColor: mode.colorBorder }}>
                          🎯 {prog.accuracy != null ? `${Math.round(prog.accuracy * 100)}%` : "—"} Accuracy
                        </span>
                        {prog.complete && (
                          <span className="bw-mp-badge" style={{ background: "#f0fdf4", color: "#14532d", borderColor: "#86efac" }}>
                            ✓ Complete
                          </span>
                        )}
                        <button className="bw-retry-btn" onClick={() => { setActiveMode(mode.id); setView("game"); }}>
                          ↺ Retry
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* LEADERBOARD + ACTIVITY */}
        <div className="bw-bottom-grid" id="bw-lb">
          <div>
            <div className="bw-section-head">
              <div className="bw-section-title">Class Leaderboard</div>
              <div className="bw-section-sub">{stats ? `${fmtNum(stats.users || lbRows.length)} students` : ""}</div>
            </div>
            <div className="bw-panel">
              <div className="bw-panel-head">
                <span className="bw-panel-title">TOP STUDENTS</span>
                <span className="bw-panel-meta">by XP earned</span>
              </div>
              {lbRows.map((r, idx) => {
                const isMe = isLoggedIn && user?.username === r.username;
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${r.rank || idx + 1}`;
                return (
                  <div key={r.rank || idx} className={`bw-lb-row ${isMe ? "bw-lb-me" : ""}`}>
                    <div className="bw-lb-rank">{medal}</div>
                    <Avatar name={r.username} size={28} />
                    <div className="bw-lb-name">
                      {r.username}
                      {isMe && <span className="bw-lb-you">YOU</span>}
                    </div>
                    <div className="bw-lb-bar">
                      <div className="bw-lb-fill" style={{ width: `${Math.round((r.totalXp / top1Xp) * 100)}%`, background: avatarColor(r.username) }} />
                    </div>
                    <div className="bw-lb-xp">{fmtNum(r.totalXp)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="bw-section-head">
              <div className="bw-section-title">Recent Plays</div>
            </div>
            <div className="bw-panel">
              <div className="bw-panel-head">
                <span className="bw-panel-title">LIVE FEED</span>
                <span className="bw-panel-meta"><span className="bw-live-dot" /> Live</span>
              </div>
              {activity.map((a, i) => (
                <div key={a.id || i} className="bw-act-row">
                  <Avatar name={a.username} size={28} />
                  <div style={{ flex: 1 }}>
                    <div className="bw-act-name">@{a.username}</div>
                    <div className="bw-act-meta">
                      {a.modeLabel || "Cache"} · {Math.round((a.accuracy || 0) * 100)}% acc · {fmtTime(a.ts || a.secsAgo || 0)}
                    </div>
                  </div>
                  <div className="bw-act-xp">+{fmtNum(a.xpEarned)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
