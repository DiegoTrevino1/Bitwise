import { useEffect, useState } from "react";
import "./SpellCounter.css";
import { postProgress, getQuestions } from "./api";

const PHASES = ["select", "pretest", "battle", "posttest", "summary"];

function HealthBar({ hp, maxHp, color }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  return (
    <div className="sc-hp-track">
      <div className="sc-hp-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function NumberSystemsGame({ mod, onBack, onHome }) {
  const [enemies, setEnemies] = useState([]);
  const [pretestQuestions, setPretestQuestions] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [phase, setPhase] = useState("select"); // select | pretest | battle | posttest | summary
  const [enemy, setEnemy] = useState(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | {correct, dmg, bits}
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [bitStats, setBitStats] = useState({ correct: 0, total: 0 });
  const [progressSent, setProgressSent] = useState(false);

  // Pre/post test state
  const [testPhase, setTestPhase] = useState("pretest"); // reused for posttest too
  const [testIdx, setTestIdx] = useState(0);
  const [testAns, setTestAns] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [showingPosttest, setShowingPosttest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getQuestions("spell", "enemy"),
      getQuestions("spell", "pretest"),
    ])
      .then(([enemyRows, pretestRows]) => {
        if (cancelled) return;
        setEnemies(enemyRows);
        setPretestQuestions(pretestRows);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message || "Failed to load questions");
      });
    return () => { cancelled = true; };
  }, []);

  const startBattle = (e) => {
    setEnemy(e);
    setEnemyHp(e.hp);
    setPlayerHp(100);
    setResult(null);
    setInput("");
    setRound(0);
    setPhase("pretest");
    setTestIdx(0);
    setTestAns(null);
    setTestResults([]);
    setShowingPosttest(false);
    setBitStats({ correct: 0, total: 0 });
    setProgressSent(false);
  };

  const handleTestAnswer = (idx) => {
    if (testAns !== null) return;
    setTestAns(idx);
    const correct = pretestQuestions[testIdx].correct === idx;
    setTestResults((r) => [...r, correct]);
  };

  const nextTestQ = () => {
    if (testIdx + 1 >= pretestQuestions.length) {
      if (showingPosttest) {
        setPhase("summary");
      } else {
        setPhase("battle");
      }
    } else {
      setTestIdx((i) => i + 1);
      setTestAns(null);
    }
  };

  const handleCast = () => {
    if (!enemy || result !== null) return;
    const ch = enemy.challenge;
    const correct = input.toUpperCase().trim() === ch.answer.toUpperCase();

    // Bit-level accuracy
    let correctBits = 0;
    const playerBin = parseInt(input, 16).toString(2).padStart(8, "0");
    const answerBin = ch.answerBin;
    for (let i = 0; i < 8; i++) {
      if (playerBin[i] === answerBin[i]) correctBits++;
    }
    const acc = correctBits / 8;
    const dmg = Math.round(acc * 40);
    const enemyDmg = correct ? 0 : 15;

    setEnemyHp((h) => Math.max(0, h - dmg));
    setPlayerHp((h) => Math.max(0, h - enemyDmg));
    if (correct) setScore((s) => s + 150 + dmg);
    setBitStats((b) => ({ correct: b.correct + correctBits, total: b.total + 8 }));
    setResult({ correct, dmg, correctBits, playerBin });
  };

  const handleNextRound = () => {
    if (enemyHp <= 0 || playerHp <= 0) {
      if (!progressSent) {
        const accuracy = bitStats.total > 0 ? bitStats.correct / bitStats.total : 0;
        postProgress({
          gameId: "spell",
          score,
          accuracy,
          xpEarned: score,
        });
        setProgressSent(true);
      }
      // Battle over — go to post-test
      setShowingPosttest(true);
      setTestIdx(0);
      setTestAns(null);
      setTestResults([]);
      setPhase("posttest");
    } else {
      setResult(null);
      setInput("");
      setRound((r) => r + 1);
    }
  };

  const tq = pretestQuestions[testIdx] || null;

  // ── SELECT ENEMY ──
  if (phase === "select") {
    return (
      <div className="sc-shell">
        <div className="sc-bg" />
        <div className="sc-container">
          <div className="sc-topbar">
            <button className="sc-back-btn" onClick={onBack}>← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="logo-icon">CWU</div>
              <div className="sc-module-tag">🔢 Spell Counter</div>
            </div>
            <button className="sc-home-btn" onClick={onHome}>⌂ Home</button>
          </div>

          <div className="sc-select-hero">
            <div className="sc-eyebrow">NUMBER SYSTEMS COMBAT</div>
            <h2 className="sc-select-title">Choose your opponent</h2>
            <p className="sc-select-sub">
              Enemies cast spells as binary, hex, or decimal numbers. Counter each spell with the correct numerical transformation to deal damage. Wrong answers cost you HP!
            </p>
          </div>

          <div className="sc-enemies-grid">
            {enemies.length === 0 && !loadError && (
              <div className="sc-enemy-card" style={{ opacity: 0.6, cursor: "default" }}>
                <div className="sc-enemy-icon">⌛</div>
                <div className="sc-enemy-name">Loading enemies…</div>
              </div>
            )}
            {loadError && (
              <div className="sc-enemy-card" style={{ borderColor: "#fc8181", cursor: "default" }}>
                <div className="sc-enemy-icon">⚠️</div>
                <div className="sc-enemy-name">Could not load</div>
                <div className="sc-enemy-desc">{loadError}</div>
              </div>
            )}
            {enemies.map((e) => {
              const ready = pretestQuestions.length > 0;
              return (
                <button
                  key={e.name}
                  className="sc-enemy-card"
                  onClick={() => startBattle(e)}
                  disabled={!ready}
                >
                  <div className="sc-enemy-icon">{e.icon}</div>
                  <div className="sc-enemy-name">{e.name}</div>
                  {e.difficulty && (
                    <span className={`sc-difficulty-badge sc-difficulty-${e.difficulty}`}>
                      {e.difficulty === "easy" ? "⬤ Easy" : e.difficulty === "medium" ? "⬤ Medium" : "⬤ Hard"}
                    </span>
                  )}
                  <div className="sc-enemy-desc">{e.desc}</div>
                  <div className="sc-enemy-hp-preview">
                    <span style={{ color: e.color, fontFamily: "var(--mono)", fontSize: "12px" }}>❤ {e.hp} HP</span>
                  </div>
                  <div className="sc-enemy-play" style={{ color: e.color }}>
                    {ready ? "Challenge →" : "Loading…"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="sc-how-it-works">
            <div className="sc-how-title">HOW IT WORKS</div>
            <div className="sc-how-grid">
              {[
                { icon: "⚡", title: "Enemy casts a spell", desc: "A number appears in binary, hex, or decimal." },
                { icon: "🧮", title: "Compute the counter", desc: "Apply the operation (e.g. bitwise NOT, +1, XOR)." },
                { icon: "🎯", title: "Bit-level scoring", desc: "Each wrong bit costs HP. Perfect answer = max damage." },
              ].map((h) => (
                <div key={h.title} className="sc-how-card">
                  <div className="sc-how-icon">{h.icon}</div>
                  <div className="sc-how-name">{h.title}</div>
                  <div className="sc-how-desc">{h.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="howto-panel">
            <div className="howto-title">How to play</div>
            <ol className="howto-steps">
              <li>Pick an enemy — each tests a different number system (binary, hex, or decimal).</li>
              <li>Answer a short <strong>pre-test</strong> (multiple choice) to set your baseline.</li>
              <li>In battle, the enemy casts a number plus an operation. Compute the result and type your answer as an <strong>8-bit value</strong>.</li>
              <li>Damage is <em>bit-level</em>: each of the 8 bits you get right deals up to <strong>40 damage</strong>. A perfect answer also adds 150 XP.</li>
              <li>Wrong full answers cost <strong>15 HP</strong>. The battle ends when either side hits 0, then you take the post-test.</li>
            </ol>
            <div className="howto-example">
              <div className="howto-example-title">Worked example</div>
              <div className="howto-example-body">
                Enemy casts <code>0x6A</code> · operation: <strong>bitwise NOT</strong><br />
                Binary: <code>0110 1010</code> → flip every bit → <code>1001 0101</code><br />
                Answer: <code>0x95</code> → all 8 bits correct → <strong>40 damage</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PRE / POST TEST ──
  if (phase === "pretest" || phase === "posttest") {
    return (
      <div className="sc-shell">
        <div className="sc-bg" />
        <div className="sc-container sc-container--narrow">
          <div className="sc-topbar">
            <button className="sc-back-btn" onClick={() => setPhase("select")}>← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="logo-icon">CWU</div>
              <div className="sc-module-tag">{phase === "pretest" ? "📋 Pre-Assessment" : "📋 Post-Assessment"}</div>
            </div>
            <div />
          </div>

          <div className="sc-test-card">
            <div className="sc-test-header">
              <div className="sc-test-eyebrow">{phase === "pretest" ? "PRE-TEST" : "POST-TEST"} · Question {testIdx + 1} of {pretestQuestions.length}</div>
              <div className="sc-test-track">
                <div className="sc-test-fill" style={{ width: `${(testIdx / pretestQuestions.length) * 100}%` }} />
              </div>
            </div>

            <p className="sc-test-q">{tq.q}</p>

            <div className="sc-test-opts">
              {tq.opts.map((o, i) => {
                let cls = "sc-test-opt";
                if (testAns !== null) {
                  if (i === tq.correct) cls += " correct";
                  else if (i === testAns && i !== tq.correct) cls += " wrong";
                  else cls += " dimmed";
                }
                return (
                  <button key={i} className={cls} onClick={() => handleTestAnswer(i)} disabled={testAns !== null}>
                    <span className="sc-test-label">{["A","B","C","D"][i]}</span>
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>

            {testAns !== null && (
              <button className="sc-btn-primary" onClick={nextTestQ} style={{ marginTop: "16px" }}>
                {testIdx + 1 >= pretestQuestions.length
                  ? (phase === "pretest" ? "Start Battle →" : "See Results →")
                  : "Next →"}
              </button>
            )}

            {phase === "pretest" && testAns === null && (
              <button className="sc-skip-test" onClick={() => setPhase("battle")}>Skip pre-test →</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SUMMARY ──
  if (phase === "summary") {
    const won = enemyHp <= 0;
    return (
      <div className="sc-shell">
        <div className="sc-bg" />
        <div className="sc-container sc-container--narrow">
          <div className="sc-topbar">
            <button className="sc-back-btn" onClick={() => setPhase("select")}>← Enemies</button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="logo-icon">CWU</div>
              <div className="sc-module-tag">🔢 Spell Counter</div>
            </div>
            <button className="sc-home-btn" onClick={onHome}>⌂ Home</button>
          </div>
          <div className="sc-summary-card">
            <div className="sc-summary-icon">{won ? "🏆" : "💀"}</div>
            <h2 className="sc-summary-title">{won ? `${enemy.name} defeated!` : "You were defeated..."}</h2>
            <p className="sc-summary-sub">{won ? "Excellent numerical transformations!" : "Practice more and try again."}</p>

            <div className="sc-summary-stats">
              <div className="sc-stat-box"><div className="sc-stat-num">{score}</div><div className="sc-stat-lbl">Total XP</div></div>
              <div className="sc-stat-box"><div className="sc-stat-num">{round}</div><div className="sc-stat-lbl">Rounds</div></div>
              <div className="sc-stat-box"><div className="sc-stat-num">{playerHp}</div><div className="sc-stat-lbl">HP left</div></div>
            </div>

            <div className="sc-summary-actions">
              <button className="sc-btn-primary" onClick={() => startBattle(enemy)}>Play Again</button>
              <button className="sc-btn-ghost" onClick={() => setPhase("select")}>Choose Opponent</button>
              <button className="sc-btn-ghost" onClick={onHome}>Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── BATTLE ──
  const ch = enemy.challenge;
  const battleOver = enemyHp <= 0 || playerHp <= 0;

  return (
    <div className="sc-shell">
      <div className="sc-bg" />

      {result?.correct && (
        <div className="sc-xp-flash">+{150 + result.dmg} XP ⚡ {result.dmg} damage!</div>
      )}

      <div className="sc-container">
        <div className="sc-topbar">
          <button className="sc-back-btn" onClick={() => setPhase("select")}>← Flee</button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="logo-icon">CWU</div>
            <div className="sc-module-tag" style={{ color: enemy.color }}>⚔ Round {round + 1}</div>
          </div>
          <div className="sc-score-pill">
            <span className="sc-score-lbl">XP</span>
            <span className="sc-score-val">{score}</span>
          </div>
        </div>

        {/* Combat arena */}
        <div className="sc-arena">
          {/* Enemy */}
          <div className="sc-combatant enemy-side">
            <div className="sc-combatant-top">
              <div className="sc-combatant-name">{enemy.name}</div>
              <div className="sc-combatant-hp-label">{enemyHp} / {enemy.hp} HP</div>
            </div>
            <HealthBar hp={enemyHp} maxHp={enemy.hp} color={enemy.color} />
            <div className="sc-enemy-sprite">{enemy.icon}</div>
          </div>

          <div className="sc-vs-divider">VS</div>

          {/* Player */}
          <div className="sc-combatant player-side">
            <div className="sc-combatant-top">
              <div className="sc-combatant-name">You</div>
              <div className="sc-combatant-hp-label">{playerHp} / 100 HP</div>
            </div>
            <HealthBar hp={playerHp} maxHp={100} color="var(--accent)" />
            <div className="sc-player-sprite">🧙‍♂️</div>
          </div>
        </div>

        {/* Spell card */}
        {!battleOver && (
          <div className="sc-spell-card">
            <div className="sc-spell-eyebrow">⚡ ENEMY CASTS A SPELL</div>
            <div className="sc-spell-display">{ch.display}</div>
            <div className="sc-spell-details">
              <div className="sc-spell-detail-row">
                <span className="sc-detail-label bin">Binary</span>
                <span className="sc-detail-val">{ch.binary.split("").map((b, i) => (
                  <span key={i} className="sc-spell-bit">{b}</span>
                ))}</span>
              </div>
              <div className="sc-spell-detail-row">
                <span className="sc-detail-label hex">Hex</span>
                <span className="sc-detail-val mono">{ch.hex}</span>
              </div>
            </div>

            <div className="sc-op-banner">
              <span className="sc-op-label">Required counter:</span>
              <span className="sc-op-val">{ch.op}</span>
            </div>

            {result === null ? (
              <div className="sc-input-row">
                <div className="sc-input-group">
                  <label className="sc-input-label">Your counter (hex):</label>
                  <input
                    className="sc-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. E5"
                    maxLength={4}
                    onKeyDown={(e) => e.key === "Enter" && handleCast()}
                  />
                </div>
                <button className="sc-btn-cast" onClick={handleCast} disabled={!input.trim()}>
                  ⚡ Cast Counter
                </button>
              </div>
            ) : (
              <div className={`sc-cast-result ${result.correct ? "correct" : "wrong"}`}>
                <div className="sc-result-header">
                  <span className="sc-result-icon">{result.correct ? "✓" : "✗"}</span>
                  <span className="sc-result-title">{result.correct ? "Perfect counter!" : "Incorrect!"}</span>
                  <span className="sc-result-dmg">{result.dmg} dmg dealt</span>
                </div>
                <div className="sc-bit-analysis">
                  <div className="sc-bit-row-label">Bit accuracy: {result.correctBits}/8 bits</div>
                  <div className="sc-bit-comparison">
                    <div className="sc-bit-row">
                      <span className="sc-bit-row-name">Your answer:</span>
                      {result.playerBin.split("").map((b, i) => (
                        <span key={i} className={`sc-result-bit ${b === ch.answerBin[i] ? "ok" : "bad"}`}>{b}</span>
                      ))}
                    </div>
                    <div className="sc-bit-row">
                      <span className="sc-bit-row-name">Correct:</span>
                      {ch.answerBin.split("").map((b, i) => (
                        <span key={i} className="sc-result-bit ok">{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="sc-btn-primary" onClick={handleNextRound}>
                  {enemyHp <= 0 ? "Victory! →" : playerHp <= 0 ? "Defeated... →" : "Next Round →"}
                </button>
              </div>
            )}
          </div>
        )}

        {battleOver && result && (
          <div className="sc-battle-over">
            <div className="sc-bo-text">{enemyHp <= 0 ? `${enemy.icon} ${enemy.name} has been defeated!` : "You have been defeated!"}</div>
            <button className="sc-btn-primary" onClick={handleNextRound}>
              Continue to Post-Test →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
