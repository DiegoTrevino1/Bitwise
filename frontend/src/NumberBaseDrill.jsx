import { useEffect, useMemo, useRef, useState } from "react";
import "./NumberBaseDrill.css";
import { postProgress } from "./api";

const BASES = [
  { id: "bin", label: "Binary",  prefix: "0b", radix: 2,  width: 8 },
  { id: "dec", label: "Decimal", prefix: "",   radix: 10, width: 0 },
  { id: "hex", label: "Hex",     prefix: "0x", radix: 16, width: 2 },
];

const PAIRS = [
  ["bin", "hex"],
  ["hex", "bin"],
  ["dec", "hex"],
  ["hex", "dec"],
  ["bin", "dec"],
  ["dec", "bin"],
];

// Rounds 1-3: binary↔decimal only, values 0-15 (easy mental math)
// Rounds 4-7: all pairs, values 0-63
// Rounds 8-10: all pairs, full 0-255 range
const DIFFICULTY_TIERS = [
  { pairs: [["bin", "dec"], ["dec", "bin"]], maxVal: 15,  label: "Easy" },
  { pairs: PAIRS,                            maxVal: 63,  label: "Medium" },
  { pairs: PAIRS,                            maxVal: 255, label: "Hard" },
];

function tierForRound(roundIdx) {
  if (roundIdx < 3) return DIFFICULTY_TIERS[0];
  if (roundIdx < 7) return DIFFICULTY_TIERS[1];
  return DIFFICULTY_TIERS[2];
}

const ROUND_COUNT = 10;
const ROUND_SECONDS = 12;

function baseById(id) {
  return BASES.find((b) => b.id === id);
}

function format(value, baseId) {
  const b = baseById(baseId);
  let s = value.toString(b.radix);
  if (b.id === "hex") s = s.toUpperCase();
  if (b.width) s = s.padStart(b.width, "0");
  return s;
}

function normalize(input, baseId) {
  if (typeof input !== "string") return "";
  let s = input.trim().toLowerCase();
  if (s.startsWith("0b") || s.startsWith("0x")) s = s.slice(2);
  if (baseId === "hex") return s.replace(/\s+/g, "").toUpperCase();
  return s.replace(/\s+/g, "");
}

function buildRound(roundIdx) {
  const tier = tierForRound(roundIdx);
  const [from, to] = tier.pairs[Math.floor(Math.random() * tier.pairs.length)];
  const value = Math.floor(Math.random() * (tier.maxVal + 1));
  return {
    from,
    to,
    value,
    difficulty: tier.label,
    promptText: format(value, from),
    answerText: format(value, to),
  };
}

function buildRounds(n) {
  const rounds = [];
  for (let i = 0; i < n; i++) rounds.push(buildRound(i));
  return rounds;
}

export default function NumberBaseDrill({ onBack, onHome }) {
  const [phase, setPhase] = useState("intro"); // intro | playing | summary
  const [rounds, setRounds] = useState(() => buildRounds(ROUND_COUNT));
  const [roundIdx, setRoundIdx] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | { correct, answer, bonus }
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [progressSent, setProgressSent] = useState(false);
  const inputRef = useRef(null);
  const tickRef = useRef(null);

  const round = phase === "playing" ? rounds[roundIdx] : null;

  // Timer countdown. Setting feedback on timeout happens *inside* the
  // interval callback (an external event source, not derived state), which
  // keeps the lint rule about cascading renders happy.
  useEffect(() => {
    if (phase !== "playing" || feedback !== null) return undefined;
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tickRef.current);
          setFeedback({
            correct: false,
            answer: rounds[roundIdx].answerText,
            bonus: 0,
            earned: 0,
            timedOut: true,
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [phase, roundIdx, feedback, rounds]);

  // Focus input on each round
  useEffect(() => {
    if (phase === "playing" && feedback === null) {
      inputRef.current?.focus();
    }
  }, [phase, roundIdx, feedback]);

  const startGame = () => {
    setRounds(buildRounds(ROUND_COUNT));
    setRoundIdx(0);
    setInput("");
    setScore(0);
    setCorrectCount(0);
    setFeedback(null);
    setSecondsLeft(ROUND_SECONDS);
    setProgressSent(false);
    setPhase("playing");
  };

  const handleSubmit = (raw) => {
    if (feedback !== null || !round) return;
    const submitted = normalize(raw ?? input, round.to);
    const expected = normalize(round.answerText, round.to);
    const correct = submitted.length > 0 && submitted === expected;
    const bonus = correct ? Math.max(0, secondsLeft) * 8 : 0;
    const earned = correct ? 100 + bonus : 0;
    if (correct) {
      setScore((s) => s + earned);
      setCorrectCount((c) => c + 1);
    }
    clearInterval(tickRef.current);
    setFeedback({ correct, answer: round.answerText, bonus, earned, timedOut: false });
  };

  const handleNext = () => {
    setFeedback(null);
    setInput("");
    setSecondsLeft(ROUND_SECONDS);
    if (roundIdx + 1 >= rounds.length) {
      finalize();
    } else {
      setRoundIdx((i) => i + 1);
    }
  };

  const finalize = () => {
    if (!progressSent) {
      const accuracy = correctCount / ROUND_COUNT;
      postProgress({
        gameId: "convert",
        score,
        accuracy,
        xpEarned: score,
      });
      setProgressSent(true);
    }
    setPhase("summary");
  };

  const accuracyPct = Math.round((correctCount / ROUND_COUNT) * 100);

  const fromBase = round && baseById(round.from);
  const toBase = round && baseById(round.to);

  const progressPct = useMemo(() => {
    if (phase !== "playing") return 0;
    return Math.round((roundIdx / ROUND_COUNT) * 100);
  }, [phase, roundIdx]);

  // ── INTRO ───────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="nbd-shell">
        <div className="nbd-bg" />
        <div className="nbd-container">
          <div className="nbd-topbar">
            <button className="nbd-back-btn" onClick={onBack}>
              ← Back
            </button>
            <div className="nbd-module-tag">🧮 Number Base Drill</div>
            <button className="nbd-home-btn" onClick={onHome}>
              ⌂ Home
            </button>
          </div>

          <div className="nbd-intro-hero">
            <div className="nbd-eyebrow">BASE CONVERSION · QUICK-FIRE</div>
            <h2 className="nbd-intro-title">Convert before the timer runs out.</h2>
            <p className="nbd-intro-sub">
              {ROUND_COUNT} rounds. {ROUND_SECONDS} seconds each. Each correct answer
              earns 100 XP plus an 8 XP/sec speed bonus. Mix of binary, decimal,
              and hex conversions.
            </p>

            <div className="nbd-rules">
              {[
                { icon: "⚡", title: "Fast input", desc: "Hex is case-insensitive. Prefixes (0x, 0b) optional." },
                { icon: "🎯", title: "Speed bonus", desc: "+8 XP × seconds remaining when you answer correctly." },
                { icon: "📈", title: "Best score", desc: "Final XP posts to your progress and leaderboard." },
              ].map((r) => (
                <div key={r.title} className="nbd-rule">
                  <div className="nbd-rule-icon">{r.icon}</div>
                  <div>
                    <div className="nbd-rule-title">{r.title}</div>
                    <div className="nbd-rule-desc">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="howto-panel">
              <div className="howto-title">How to play</div>
              <ol className="howto-steps">
                <li>An 8-bit value flashes in one base — <strong>binary</strong>, <strong>decimal</strong>, or <strong>hex</strong>.</li>
                <li>The input label tells you the <strong>target base</strong> to convert into.</li>
                <li>Type the converted value and press <em>Enter</em> before the 12-second timer hits zero.</li>
                <li>Correct = <strong>100 XP</strong> + an <strong>8 XP/sec</strong> speed bonus. Wrong or timeout = 0.</li>
              </ol>
              <div className="howto-example">
                <div className="howto-example-title">Worked example</div>
                <div className="howto-example-body">
                  Prompt: <code>0b10110100</code> · target: <strong>Hex</strong><br />
                  Split into nibbles → <code>1011</code> <code>0100</code><br />
                  Convert each nibble → <code>B</code>, <code>4</code><br />
                  Answer: <code>B4</code>
                </div>
              </div>
            </div>

            <button className="nbd-btn-primary" onClick={startGame}>
              Start Drill →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUMMARY ─────────────────────────────────────────────────
  if (phase === "summary") {
    const grade =
      accuracyPct >= 90 ? { label: "🏆 Mastery", tone: "win" }
      : accuracyPct >= 70 ? { label: "🎯 Solid run", tone: "ok" }
      : accuracyPct >= 40 ? { label: "📖 Keep practicing", tone: "mid" }
      : { label: "💀 Rough drill", tone: "lose" };

    return (
      <div className="nbd-shell">
        <div className="nbd-bg" />
        <div className="nbd-container">
          <div className="nbd-topbar">
            <button className="nbd-back-btn" onClick={onBack}>← Back</button>
            <div className="nbd-module-tag">🧮 Number Base Drill</div>
            <button className="nbd-home-btn" onClick={onHome}>⌂ Home</button>
          </div>

          <div className={`nbd-summary tone-${grade.tone}`}>
            <div className="nbd-summary-icon">🧮</div>
            <div className="nbd-summary-grade">{grade.label}</div>
            <div className="nbd-summary-stats">
              <div className="nbd-stat">
                <div className="nbd-stat-num">{score}</div>
                <div className="nbd-stat-lbl">XP earned</div>
              </div>
              <div className="nbd-stat">
                <div className="nbd-stat-num">{correctCount}/{ROUND_COUNT}</div>
                <div className="nbd-stat-lbl">Correct</div>
              </div>
              <div className="nbd-stat">
                <div className="nbd-stat-num">{accuracyPct}%</div>
                <div className="nbd-stat-lbl">Accuracy</div>
              </div>
            </div>
            <div className="nbd-summary-actions">
              <button className="nbd-btn-primary" onClick={startGame}>
                Play again →
              </button>
              <button className="nbd-btn-ghost" onClick={onHome}>Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ─────────────────────────────────────────────────
  return (
    <div className="nbd-shell">
      <div className="nbd-bg" />
      <div className="nbd-container">
        <div className="nbd-topbar">
          <button className="nbd-back-btn" onClick={() => setPhase("intro")}>
            ← Quit
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="nbd-module-tag">🧮 Round {roundIdx + 1} / {ROUND_COUNT}</div>
            {round.difficulty && (
              <span className={`nbd-difficulty-badge nbd-difficulty-${round.difficulty.toLowerCase()}`}>
                {round.difficulty}
              </span>
            )}
          </div>
          <div className="nbd-score-pill">
            <span className="nbd-score-lbl">XP</span>
            <span className="nbd-score-val">{score}</span>
          </div>
        </div>

        <div className="nbd-progress-row">
          <div className="nbd-progress-track">
            <div className="nbd-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="nbd-progress-label">{correctCount} correct</span>
        </div>

        <div className="nbd-card">
          <div className="nbd-card-head">
            <span className="nbd-from-label">{fromBase.label} input</span>
            <span className={`nbd-timer ${secondsLeft <= 3 ? "danger" : ""}`}>
              ⏱ {secondsLeft}s
            </span>
          </div>

          <div className="nbd-prompt">
            <span className="nbd-prompt-prefix">{fromBase.prefix}</span>
            <span className="nbd-prompt-value">{round.promptText}</span>
          </div>

          <div className="nbd-instruction">
            Convert to <span className="nbd-instruction-target">{toBase.label}</span>
          </div>

          {feedback === null ? (
            <div className="nbd-input-row">
              <span className="nbd-input-prefix">{toBase.prefix}</span>
              <input
                ref={inputRef}
                className="nbd-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Enter ${toBase.label.toLowerCase()}…`}
                onKeyDown={(e) => e.key === "Enter" && input.trim() && handleSubmit()}
                autoFocus
              />
              <button
                className="nbd-btn-cast"
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
              >
                Submit ⚡
              </button>
            </div>
          ) : (
            <div className={`nbd-feedback ${feedback.correct ? "correct" : "wrong"}`}>
              <div className="nbd-feedback-head">
                <span className="nbd-feedback-icon">
                  {feedback.correct ? "✓" : feedback.timedOut ? "⏱" : "✗"}
                </span>
                <span className="nbd-feedback-title">
                  {feedback.correct
                    ? `+${feedback.earned} XP${feedback.bonus ? ` (incl. ${feedback.bonus} bonus)` : ""}`
                    : feedback.timedOut
                    ? "Timed out!"
                    : "Wrong answer"}
                </span>
              </div>
              {!feedback.correct && (
                <div className="nbd-feedback-answer">
                  Correct answer:{" "}
                  <span className="nbd-feedback-value">
                    {toBase.prefix}
                    {feedback.answer}
                  </span>
                </div>
              )}
              <button className="nbd-btn-primary" onClick={handleNext}>
                {roundIdx + 1 >= rounds.length ? "See results →" : "Next round →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
