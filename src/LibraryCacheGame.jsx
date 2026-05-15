import { useEffect, useState } from "react";
import "./LibraryCacheGame.css";
import { postProgress, getQuestions } from "./api";

const MODES = [
  { id: "direct", label: "Direct Mapping", icon: "🗂️", desc: "Each book maps to exactly one cache slot determined by the index bits." },
  { id: "set", label: "Set-Associative", icon: "📚", desc: "The index selects a set; place the book in any open slot within that set." },
  { id: "associative", label: "Fully Associative", icon: "🔓", desc: "Any book may be placed in any cache slot — maximum flexibility." },
];

// 4x4 cache grid (16 slots)
const INIT_CACHE = Array(16).fill(null);

export default function CacheMappingGame({ mod, onBack, onHome }) {
  const [requests, setRequests] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [mode, setMode] = useState(null); // null = mode select screen
  const [phase, setPhase] = useState("intro"); // intro | playing | summary
  const [reqIdx, setReqIdx] = useState(0);
  const [cache, setCache] = useState(INIT_CACHE);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "wrong"
  const [score, setScore] = useState(0);
  const [placedCount, setPlacedCount] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getQuestions("cache", "request")
      .then((rows) => { if (!cancelled) setRequests(rows); })
      .catch((e) => { if (!cancelled) setLoadError(e.message || "Failed to load requests"); });
    return () => { cancelled = true; };
  }, []);

  const req = requests.length > 0 ? requests[reqIdx % requests.length] : null;

  // Correct slot for direct mapping = parseInt(index, 2)
  const correctSlot = req ? parseInt(req.index, 2) : null;

  const handleModeSelect = (m) => {
    setMode(m);
    setPhase("playing");
    setCache(INIT_CACHE);
    setReqIdx(0);
    setScore(0);
    setPlacedCount(0);
    setFeedback(null);
    setSelectedSlot(null);
    setHintVisible(false);
  };

  const handleSlotClick = (slotIdx) => {
    if (feedback !== null) return;
    setSelectedSlot(slotIdx);
  };

  const handlePlace = () => {
    if (selectedSlot === null || feedback !== null) return;

    let isCorrect = false;
    if (mode.id === "direct") {
      isCorrect = selectedSlot === correctSlot;
    } else if (mode.id === "set") {
      // set = index bits → slots in the same row (set of 4)
      const correctSet = parseInt(req.index, 2);
      isCorrect = Math.floor(selectedSlot / 4) === correctSet;
    } else {
      // fully associative — any empty slot
      isCorrect = cache[selectedSlot] === null;
    }

    const newCache = [...cache];
    newCache[selectedSlot] = req.book;
    setCache(newCache);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setScore((s) => s + 100);
    setPlacedCount((c) => c + 1);
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedSlot(null);
    setHintVisible(false);
    if (reqIdx + 1 >= requests.length) {
      const finalScore = score;
      const accuracy = finalScore / (requests.length * 100);
      postProgress({
        gameId: "cache",
        score: finalScore,
        accuracy,
        xpEarned: finalScore,
      });
      setPhase("summary");
    } else {
      setReqIdx((i) => i + 1);
    }
  };

  // ── MODE SELECT ──────────────────────────────────────────────
  if (!mode || phase === "intro") {
    return (
      <div className="lcg-shell">
        <div className="lcg-bg-grid" />
        <div className="lcg-container">
          <div className="lcg-topbar">
            <button className="lcg-back-btn" onClick={onBack}>← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="lcg-module-tag">🗄️ Library Cache Mapping Puzzle</div>
            </div>
            <button className="lcg-home-btn" onClick={onHome}>⌂ Home</button>
          </div>

          <div className="lcg-mode-hero">
            <div className="lcg-mode-eyebrow">SELECT MAPPING MODE</div>
            <h2 className="lcg-mode-title">How should the library cache its books?</h2>
            <p className="lcg-mode-sub">
              You control an intelligent library system. Binary addresses (6-bit) identify each book.
              Choose a mapping strategy, then place incoming books into the correct cache slots.
            </p>

            <div className="lcg-address-legend">
              <div className="lcg-addr-bit tag">11</div>
              <div className="lcg-addr-bit index">00</div>
              <div className="lcg-addr-bit offset">10</div>
              <span className="lcg-addr-label tag-label">Tag (shelf)</span>
              <span className="lcg-addr-label idx-label">Index (set)</span>
              <span className="lcg-addr-label off-label">Offset (book)</span>
            </div>
          </div>

          <div className="lcg-modes-grid">
            {MODES.map((m) => (
              <button
                key={m.id}
                className="lcg-mode-card"
                onClick={() => handleModeSelect(m)}
                disabled={requests.length === 0}
              >
                <div className="lcg-mode-icon">{m.icon}</div>
                <div className="lcg-mode-name">{m.label}</div>
                <div className="lcg-mode-desc">{m.desc}</div>
                <div className="lcg-mode-play">
                  {loadError ? "Unavailable" : requests.length === 0 ? "Loading…" : "Play →"}
                </div>
              </button>
            ))}
          </div>
          {loadError && (
            <div className="lcg-quiz-strip" style={{ borderColor: "#fc8181" }}>
              <div className="lcg-quiz-left">
                <span className="lcg-quiz-icon">⚠️</span>
                <div>
                  <div className="lcg-quiz-title">Could not load questions</div>
                  <div className="lcg-quiz-sub">{loadError}</div>
                </div>
              </div>
            </div>
          )}

          <div className="howto-panel">
            <div className="howto-title">How to play</div>
            <ol className="howto-steps">
              <li>A 6-bit address appears with a book. Split it into <strong>tag</strong>, <strong>index</strong>, and <strong>offset</strong> — 2 bits each.</li>
              <li>The <em>mapping mode</em> you picked decides which slots are valid for that address.</li>
              <li>Click a valid slot in the 4×4 cache grid, then press <em>Place</em>.</li>
              <li>Correct placement scores <strong>100 XP</strong>. Wrong placements still fill the slot but earn 0.</li>
            </ol>
            <div className="howto-example">
              <div className="howto-example-title">Worked example — address <code>110010</code></div>
              <div className="howto-example-body">
                tag = <code>11</code> · index = <code>00</code> · offset = <code>10</code><br />
                <strong>Direct mapping:</strong> slot is determined by the index → row 0.<br />
                <strong>Set-associative:</strong> the index picks a set → place in any open slot of row 0.<br />
                <strong>Fully associative:</strong> place in any empty slot anywhere in the grid.
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── SUMMARY ──────────────────────────────────────────────────
  if (phase === "summary") {
    const pct = requests.length > 0 ? Math.round((score / (requests.length * 100)) * 100) : 0;
    return (
      <div className="lcg-shell">
        <div className="lcg-bg-grid" />
        <div className="lcg-container">
          <div className="lcg-topbar">
            <button className="lcg-back-btn" onClick={onBack}>← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="lcg-module-tag">🗄️ Library Cache Mapping Puzzle</div>
            </div>
            <button className="lcg-home-btn" onClick={onHome}>⌂ Home</button>
          </div>

          <div className="lcg-summary-card">
            <div className="lcg-summary-header">
              <div className="lcg-summary-icon">{pct >= 70 ? "🏆" : "📖"}</div>
              <h2 className="lcg-summary-title">{pct >= 70 ? "Well done!" : "Keep practicing!"}</h2>
              <p className="lcg-summary-sub">{mode.label} · Round complete</p>
            </div>
            <div className="lcg-summary-stats">
              <div className="lcg-stat-box"><div className="lcg-stat-num">{score}</div><div className="lcg-stat-lbl">XP earned</div></div>
              <div className="lcg-stat-box"><div className="lcg-stat-num">{pct}%</div><div className="lcg-stat-lbl">Accuracy</div></div>
              <div className="lcg-stat-box"><div className="lcg-stat-num">{placedCount}</div><div className="lcg-stat-lbl">Books placed</div></div>
            </div>
            <div className="lcg-summary-actions">
              <button className="lcg-btn-primary" onClick={() => { setMode(null); setPhase("intro"); }}>Try Another Mode</button>
              <button className="lcg-btn-ghost" onClick={onHome}>Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────
  return (
    <div className="lcg-shell">
      <div className="lcg-bg-grid" />

      {feedback === "correct" && (
        <div className="lcg-xp-flash">+100 XP ✓ Correct placement!</div>
      )}

      <div className="lcg-container">
        <div className="lcg-topbar">
          <button className="lcg-back-btn" onClick={() => setMode(null)}>← Modes</button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="lcg-module-tag">🗄️ {mode.label}</div>
          </div>
          <div className="lcg-score-pill">
            <span className="lcg-score-lbl">XP</span>
            <span className="lcg-score-val">{score}</span>
          </div>
        </div>

        <div className="lcg-progress-row">
          <div className="lcg-progress-track">
            <div className="lcg-progress-fill" style={{ width: `${(reqIdx / requests.length) * 100}%` }} />
          </div>
          <span className="lcg-progress-label">{reqIdx + 1} / {requests.length}</span>
        </div>

        <div className="lcg-play-grid">
          {/* LEFT: incoming request + address decoder */}
          <div className="lcg-left-col">
            <div className="lcg-request-card">
              <div className="lcg-req-top-row">
                <div className="lcg-req-eyebrow">📥 INCOMING REQUEST</div>
                {req.difficulty && (
                  <span className={`lcg-difficulty-badge lcg-difficulty-${req.difficulty}`}>
                    {req.difficulty === "beginner" ? "⬤ Beginner" : req.difficulty === "intermediate" ? "⬤ Intermediate" : "⬤ Advanced"}
                  </span>
                )}
              </div>
              <div className="lcg-req-book">{req.book}</div>
              <div className="lcg-req-addr-row">
                <span className="lcg-req-addr-label">6-bit address:</span>
                <div className="lcg-req-addr-bits">
                  {req.addr.split("").map((bit, i) => (
                    <span key={i} className={`lcg-bit ${i < 2 ? "tag" : i < 4 ? "index" : "offset"}`}>{bit}</span>
                  ))}
                </div>
              </div>
              <div className="lcg-decoded">
                <div className="lcg-decoded-row"><span className="lcg-decoded-lbl tag">Tag</span><span className="lcg-decoded-val">{req.tag} (identifies the block)</span></div>
                <div className="lcg-decoded-row"><span className="lcg-decoded-lbl index">Index</span><span className="lcg-decoded-val">{req.index} (determines placement)</span></div>
                <div className="lcg-decoded-row"><span className="lcg-decoded-lbl offset">Offset</span><span className="lcg-decoded-val">{req.offset} (byte within block)</span></div>
              </div>

              {mode.id === "direct" && (
                <div className="lcg-rule-pill">Rule: Convert the index bits to decimal → that slot number is your only valid choice</div>
              )}
              {mode.id === "set" && (
                <div className="lcg-rule-pill index">Rule: Convert the index bits to decimal → place in any open slot within that row</div>
              )}
              {mode.id === "associative" && (
                <div className="lcg-rule-pill offset">Rule: No address constraint — any empty slot in the grid is valid</div>
              )}
            </div>

            {feedback === null && req.hints?.[mode.id] && (
              <div className="lcg-hint-wrap">
                {hintVisible ? (
                  <div className="lcg-hint-box">
                    <span className="lcg-hint-label">💡 HINT</span>
                    <p className="lcg-hint-text">{req.hints[mode.id]}</p>
                  </div>
                ) : (
                  <button className="lcg-btn-hint" onClick={() => setHintVisible(true)}>
                    💡 Show Hint
                  </button>
                )}
              </div>
            )}

            {feedback === null && (
              <button className="lcg-btn-place" onClick={handlePlace} disabled={selectedSlot === null}>
                {selectedSlot === null ? "← Click a cache slot" : `Place in Slot ${selectedSlot} →`}
              </button>
            )}

            {feedback === "correct" && (
              <div className="lcg-feedback correct">
                <div className="lcg-fb-title">✓ Correct!</div>
                <p className="lcg-fb-body">The book was placed in the right slot based on {mode.label.toLowerCase()} rules.</p>
                {req.explanation && (
                  <div className="lcg-explanation">
                    <span className="lcg-explanation-label">📖 Explanation</span>
                    <p className="lcg-explanation-text">{req.explanation}</p>
                  </div>
                )}
                <button className="lcg-btn-primary" onClick={handleNext}>Next Request →</button>
              </div>
            )}

            {feedback === "wrong" && (
              <div className="lcg-feedback wrong">
                <div className="lcg-fb-title">✗ Incorrect placement</div>
                <p className="lcg-fb-body">
                  {mode.id === "direct" ? `Direct mapping requires slot ${correctSlot} (index bits = ${req.index}).` :
                   mode.id === "set" ? `Set-associative: the index bits (${req.index}) point to Row ${parseInt(req.index, 2)}.` :
                   "Fully associative: just pick an empty slot."}
                </p>
                {req.explanation && (
                  <div className="lcg-explanation">
                    <span className="lcg-explanation-label">📖 Explanation</span>
                    <p className="lcg-explanation-text">{req.explanation}</p>
                  </div>
                )}
                <button className="lcg-btn-primary" onClick={handleNext}>Continue →</button>
              </div>
            )}
          </div>

          {/* RIGHT: 4×4 cache grid */}
          <div className="lcg-right-col">
            <div className="lcg-cache-label">CACHE (16 slots · 4 rows)</div>
            <div className="lcg-cache-grid">
              {cache.map((entry, i) => {
                let cls = "lcg-slot";
                if (entry) cls += " occupied";
                if (selectedSlot === i && !feedback) cls += " selected";
                if (feedback === "correct" && selectedSlot === i) cls += " highlight-correct";
                if (feedback === "wrong" && selectedSlot === i) cls += " highlight-wrong";

                // Show row label
                const isRowStart = i % 4 === 0;

                return (
                  <div key={i} className="lcg-slot-wrapper">
                    {isRowStart && (
                      <div className="lcg-row-label">Row {Math.floor(i / 4)}</div>
                    )}
                    <button
                      className={cls}
                      onClick={() => handleSlotClick(i)}
                      disabled={feedback !== null}
                    >
                      <span className="lcg-slot-num">{i}</span>
                      {entry ? (
                        <span className="lcg-slot-book">📖</span>
                      ) : (
                        <span className="lcg-slot-empty">—</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="lcg-cache-legend">
              <span className="lcg-legend-item"><span className="lcg-legend-dot empty" />Empty</span>
              <span className="lcg-legend-item"><span className="lcg-legend-dot occupied" />Book cached</span>
              <span className="lcg-legend-item"><span className="lcg-legend-dot selected" />Selected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
